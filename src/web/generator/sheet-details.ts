import { routeColor } from '../drawing.js'
import type { SheetContext, SheetEnergy, SheetResult, StorageValues } from './sheet-types'
import { element as $, esc, fmt, ROLE_NAMES } from './sheet-ui'

export function fillAlert(d: SheetResult) {
  const box = $('sheet-alert')
  if ('array' in d || d.feasible) {
    box.hidden = true
    return
  }
  box.hidden = false
  const why =
    d.penalties.find((x) => x.kind !== 'power')?.msg ??
    d.penalties[0]?.msg ??
    d.validate.errors[0] ??
    ''
  const tip =
    d.metrics.factories > 120 || d.metrics.stationFallback
      ? '产线太大，一块排不下：在「外部供应」里把被多处使用的中间产物（比如电路板、处理器）设为外部供应，拆成几块分别生成；或者把「搜索力度」调高一档。'
      : '把「搜索力度」调高一档再试；还不行就在「外部供应」里拆出一部分。'
  box.innerHTML = `<strong>这张图不可行，贴进游戏会有断带或接不上的地方。</strong>${why ? `${esc(why)}。` : ''}${tip}`
}
export function fillSheetStats(d: SheetResult) {
  const m = d.metrics
  const issues = d.check.errors.length + d.penalties.length + d.validate.errors.length
  const box = $('sheet-stats')
  box.hidden = false
  box.innerHTML =
    `<span><b>${m.width}×${m.height}</b>格</span><span>利用率<b>${Math.round((m.space?.space ?? 0) * 100)}%</b></span><span>传送带<b>${m.belts}</b></span>` +
    (d.feasible && d.check.ok
      ? '<span class="ok">检查通过</span>'
      : `<button type="button" class="warn" title="看下面的「检查」">需注意 ${issues || ''} 处</button>`)
}
export function fillLegend(d: SheetResult) {
  $('legend').innerHTML = Object.entries(d.model.items)
    .map(
      ([id, it]) =>
        `<li><span class="sw" style="--c:${routeColor(d.model, Number(id))}"></span><span>${esc(it.name)}</span><span class="legend-rate">${fmt(it.rate)}<small>/分</small></span></li>`,
    )
    .join('')
  $('factory-legend').innerHTML = d.groups
    .map(
      (g) =>
        `<span><b>${esc(g.letter)}</b>${esc(g.item)} <small>×${g.count}${'levels' in g && g.levels > 1 ? ` 叠×${g.levels} 层` : ''}</small></span>`,
    )
    .join('')
}
export function fillTitleBlock(ctx: SheetContext, d: SheetResult) {
  const m = d.metrics
  const top = ctx.floors.filter((f) => f.cells.size).at(-1)?.z ?? 0
  const wide = (k: string, v: string) =>
    `<tr><th>${k}</th><td class="wide" colspan="3">${v}</td></tr>`
  const box = $('titleblock')
  box.hidden = false
  box.innerHTML =
    '<caption>DRAWING DATA / 图纸参数</caption>' +
    wide('产线', esc(d.title ?? `${d.target} ${fmt(d.rate)}/分`)) +
    `<tr><th>尺寸</th><td>${m.width} × ${m.height}</td><th>面积</th><td>${m.area}</td></tr><tr><th>空间利用率</th><td>${Math.round((m.space?.space ?? 0) * 100)}%</td><th>工厂</th><td>${m.factories}</td></tr><tr><th>传送带</th><td>${m.belts}</td><th>分拣器</th><td>${m.sorters}</td></tr>` +
    (top > 0 ? wide('高架', `最高 L${top + 1}`) : '') +
    (m.power ? wide('供电', `${esc(m.power.name)} ${m.power.count} 座`) : '') +
    (d.energy
      ? wide(
          '用电',
          `待机 ${esc(d.energy.idleText)} · 工作 ${esc(d.energy.workText)}${d.energy.sprayText ? ` · 喷涂另加 ${esc(d.energy.sprayText)}` : ''}`,
        )
      : '')
}
export function fillPorts(ctx: SheetContext, d: SheetResult) {
  if (d.stations?.length) {
    const roleTxt = (r: string) => (r === 'supply' ? '供应' : r === 'warper' ? '星际需求' : '需求')
    const cfgTxt = (x: StorageValues) =>
      x.localRole === x.remoteRole
        ? ROLE_NAMES[x.localRole]
        : `本地${ROLE_NAMES[x.localRole]}、星际${ROLE_NAMES[x.remoteRole]}`
    $('ports').innerHTML = d.stations
      .map((st, k) => {
        const cfg = d.stationCfg[k]?.storage.filter((x) => x.itemId)
        const items = cfg?.length
          ? cfg
              .map(
                (x) =>
                  `${esc(ctx.byId.get(x.itemId)?.name ?? x.itemId)}（${cfgTxt(x)}，上限 ${x.max}）`,
              )
              .join('、')
          : st.items.map((it) => `${esc(it.name)}（${roleTxt(it.role)}）`).join('、')
        const ps = st.ports
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((p) => `${p.slot} 号口${p.dir === 'out' ? '出' : '进'} ${esc(p.item)}`)
          .join('，')
        return `<li>物流站 ${k + 1}（中心第 <span class="num">${st.x}</span> 列、第 <span class="num">${st.y}</span> 行）：${items}。${ps}</li>`
      })
      .join('')
    return
  }
  const order = (a: { kind: string; y: number }, b: { kind: string; y: number }) =>
    a.kind === b.kind ? b.y - a.y : a.kind === 'in' ? -1 : 1
  const num = (v: number | string) => `<span class="num">${v}</span>`
  const stores = ('stores' in d ? d.stores : [])
    .slice()
    .sort(order)
    .map(
      (s) =>
        `<li>${s.kind === 'in' ? '' : '成品 '}${esc(s.item)} ${num(fmt(s.rate))}/分：${s.rows ? `第 ${s.rows.map(num).join('、')} ${s.unit}` : `${s.side}边第 ${num(s.y)} ${s.unit}`}的${s.what} ${num(s.count)} 个${s.layers > 1 ? `，每个叠 ${num(s.layers)} 层` : ''}${s.dist ? `，顶上放物流配送器（${s.kind === 'in' ? '向其他配送器需求' : '向其他配送器供应'}）` : ''}，装满够 ${num(Math.floor(s.minutes))} 分钟</li>`,
    )
  const lines = d.ports
    .filter((p) => p.store == null)
    .sort(order)
    .map(
      (p) =>
        `<li>${p.kind === 'in' ? '' : '成品 '}${esc(p.item)} ${num(fmt(p.rate))}/分，从${p.side}边第 ${num(p.y)} ${p.unit ?? '行'}${p.kind === 'in' ? '送入' : '出来'}</li>`,
    )
  $('ports').innerHTML = [...stores, ...lines].join('') || '<li>没有外部接口。</li>'
}
const PEN: Record<string, string> = {
  tracks: '通道里带子太多，分拣器够不着',
  slots: '工厂一侧要接的物品超过分拣器位',
  shortfall: '有工厂取不到料',
  clash: '上下两行的分拣器撞在同一列',
  slow: '分拣器不够快',
  belt: '带子流量超过单条带运力',
  level: '高架叠不下',
  route: '有带子接不上',
  spray: '有带子留不出喷涂机的位置',
  power: '有工厂不在供电范围内',
  width: '超过宽度上限',
  height: '超过长度上限',
  aspect: '长宽比超过上限',
  long: '有带子超过长度上限',
  fill: '工厂行没排满',
}
const RR: Record<string, string> = {
  nodes: '带节',
  air: '离地',
  lifts: '原地升降',
  top: '最高层',
  stacked: '叠格',
  meet: '相遇',
  turns: '拐弯',
  area: '面积',
  finalCost: '最终代价',
}
export function fillNotes(d: SheetResult) {
  const li: string[] = []
  if ('array' in d) {
    for (const e of d.check.errors) li.push(`<li class="err">${esc(e)}</li>`)
    if (d.check.warnings.length)
      console.info('[dsp-handcraft] 检查提醒：\n' + d.check.warnings.map((x) => `- ${x}`).join('\n'))
    for (const n of d.array.notes) li.push(`<li>${esc(n)}</li>`)
    li.push(
      'engine' in d.array.plan && d.array.plan.engine === 'anneal'
        ? '<li>图中字母是各个氢循环（每个接物流站一个出站口、一个进站口）；三角指向分馏塔的产物口。半层的是重氢跨过回程带的那一节，1 层的是增产剂带，分在 L2、L3 查看。</li>'
        : '<li>图中 A~D 是四个氢循环（各接物流站一个出站口）；三角指向分馏塔的产物口。原图的高架有两种高度（0.5 和 1 层），分在 L2、L3 查看。</li>',
    )
    $('notes').innerHTML = li.join('')
    return
  }
  const dev = [...d.check.warnings]
  if (d.check.ok && d.feasible) li.push('<li class="ok">检查通过。</li>')
  const kinds = new Map<string, { n: number; msg: string }>()
  for (const p of d.penalties) {
    const k = kinds.get(p.kind) ?? { n: 0, msg: p.msg }
    k.n++
    kinds.set(p.kind, k)
  }
  const hard = [...kinds]
    .filter(([k]) => !['aspect', 'long', 'fill'].includes(k))
    .sort((a, b) => b[1].n - a[1].n)
  for (const [k, v] of hard.slice(0, 4))
    li.push(
      `<li class="err">${PEN[k] ?? esc(k)}${v.n > 1 ? `（${v.n} 处）` : ''}，比如：${esc(v.msg)}</li>`,
    )
  if (hard.length > 4)
    li.push(
      `<li class="err">还有 ${hard
        .slice(4)
        .map(([k]) => PEN[k] ?? esc(k))
        .join('、')}。</li>`,
    )
  for (const k of ['aspect', 'long']) {
    const p = kinds.get(k)
    if (p) li.push(`<li>${esc(p.msg)}</li>`)
  }
  dev.push(...d.penalties.map((p) => p.msg))
  if (d.feasible) {
    for (const e of [...d.check.errors, ...d.validate.errors])
      li.push(`<li class="err">${esc(e)}</li>`)
  } else {
    if (d.check.errors.length)
      li.push(
        `<li class="err">贴进游戏会有 ${d.check.errors.length} 处断带、分拣器够不着这类问题。</li>`,
      )
    dev.push(...d.check.errors, ...d.validate.errors)
  }
  const m = d.metrics
  if (m.stationFallback)
    li.push(
      '<li class="err">物流站没放进空地，改成了靠左侧站列。可以在「外部供应」里拆出一部分再试。</li>',
    )
  if (m.coreSwitch)
    dev.push(
      `内核：排版内核搜了 ${m.coreSwitch.segments} 段还不可行，换主干内核${m.coreSwitch.warm ? '从排版内核最好那张接着排（热启动）' : '从头排了一遍'}`,
    )
  else if (m.core === 'typeset') dev.push('内核：排版内核')
  if (!d.feasible && m.factories > 120)
    li.push(
      '<li class="err">产线太大，排不下。可以在「外部供应」里把电路板、处理器这类中间产物设为外部供应，分开生成。</li>',
    )
  const tech = [m.lifted && '直上直下的垂直传送带', m.steep && '一格升一层的陡坡'].filter(Boolean)
  if (tech.length && !m.noLift)
    li.push(`<li>用到${tech.join('和')}，前期没解锁「超级磁场发生器」时建不了。</li>`)
  if (m.noLift)
    dev.push(
      '按没解锁「超级磁场发生器」出图（全部选了最低配置）：不用垂直传送带，高架升降走每格半层的坡；带上不放自动集装机',
    )
  const rr = m.reroute
  if (rr?.tried) {
    const why = rr.why
      .map((w) =>
        w
          .split('，')
          .map((s) => s.replace(/^[a-zA-Z]+/, (k) => RR[k] ?? k))
          .join('，'),
      )
      .join('；')
    dev.push(
      rr.used
        ? `重走传送带：第 ${rr.used} 次换上（${rr.ms} 毫秒）`
        : `重走传送带：留了原图，${why}（${rr.ms} 毫秒）`,
    )
  }
  if (m.orient) {
    const { used, alt } = m.orient
    if (used === 'v') li.push('<li>竖排：整张已经转好 90°，贴的时候不用再转。</li>')
    if (alt)
      dev.push(
        `另一个方向 ${alt.width}×${alt.height}、${alt.area} 格、传送带 ${alt.belts}${alt.feasible ? '' : '（不可行）'}`,
      )
  }
  if (!m.power) li.push('<li>没放供电，贴好后自己补。</li>')
  if (d.latitude && !d.latitude.high)
    li.push(
      `<li>${esc(d.latitude.factory)}按赤道的紧凑间距排，只能贴在赤道附近。要贴到高纬度，打开「化工厂、精炼厂高纬度间距展开」。</li>`,
    )
  const ad = d.addons
  if (ad?.spray) {
    const lines = ad.lines ?? []
    const st = [...new Set(lines.map((x) => x.match(/^物流站 (\d+)/)?.[1]).filter(Boolean))]
    const where = st.length
      ? `物流站 ${st.join('、')} 里放增产剂`
      : lines.length && lines.every((x) => x.startsWith('储物仓'))
        ? '增产剂放进储物仓'
        : '增产剂从边缘的入口送进来'
    li.push(`<li>${where}，约 ${fmt(ad.spray.rate)}/分。</li>`)
    dev.push(
      `增产剂带 ${lines.length} 条：${lines.join('、')}；吃到增产的配方：${ad.spray.units.join('、')}`,
    )
  }
  if (ad?.warper)
    li.push(
      `<li>空间翘曲器放进物流站 ${ad.warper.home}${ad.warper.to.length ? `，传送带会送到物流站 ${ad.warper.to.join('、')}` : ''}。</li>`,
    )
  dev.push(...(ad?.notes ?? []))
  if (d.byproducts?.length)
    li.push(
      `<li>副产物 ${d.byproducts.map((b) => `${esc(b.name)} ${fmt(b.rate)}/分`).join('、')} 单独一条带送出${d.stations?.length ? '进物流站' : d.byproducts.every((b) => (d.stores ?? []).some((s) => s.kind === 'out' && s.item === b.name)) ? '进储物仓 / 储液罐，满了要取走' : '，要接走，不然会堵'}。</li>`,
    )
  if (dev.length) console.info('[dsp-handcraft] 规划细节：\n' + dev.map((x) => `- ${x}`).join('\n'))
  $('notes').innerHTML = li.join('')
}
export function fillPowerCard(e: SheetEnergy | null | undefined, railTab: (power: boolean) => void) {
  const box = $('power-pane')
  $('tab-power').hidden = !e
  if (!e) {
    railTab(false)
    box.innerHTML = ''
    return
  }
  const row = (k: string, v: string) => `<dt>${k}</dt><dd>${esc(v)}</dd>`
  box.innerHTML =
    `<dl>${row('待机', e.idleText)}${row('工作', e.workText)}${e.sprayText ? row('喷涂另加', e.sprayText) : ''}${row('最大约', e.maxText)}</dl><table><caption>按额定功率要</caption>${e.gens.map((g) => `<tr><th>${esc(g.name)}</th><td>${g.n.toFixed(2)} ${esc(g.unit)}</td></tr>`).join('')}</table>` +
    (e.stations
      ? `<p>物流站充电另算（${e.stations} 座最多 ${esc(e.stationChargeText)}，电存满后就很少）</p>`
      : '')
}
