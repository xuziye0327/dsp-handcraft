import type { XY, ZonePlacement } from '../../engine/beltless/perimeter.ts'
import type { BeltlessZone } from '../../engine/beltless/repack.ts'
import { beltlessSvg } from '../beltless.js'
import type { Viewer } from '../viewer.js'
import type { BeltlessResult } from '../worker.js'
import { flatPlacement } from './flat-placement'
import type { PlanParams } from './settings'
import { byId as $, fmt, esc, type Target, type CatalogItem, type ItemIcon } from './shared'
import type { SheetEnergy } from './sheet-types'
type FlatResult = Exclude<BeltlessResult, { error: string }>
type Inspected = BeltlessResult
export interface FlatRequest {
  type: 'beltless'
  id: number
  params: PlanParams
  zoneAt?: ZonePlacement
  partShift?: XY[]
}
interface FlatContext {
  viewer: Viewer
  items: Map<number, CatalogItem>
  send: (m: FlatRequest) => void
  buildParams: () => PlanParams
  setStatus: (text: string, warn?: boolean) => void
  newResult: () => void
  resetSheet: () => void
  fillPowerCard: (energy?: SheetEnergy | null) => void
  railTab: (power: boolean) => void
  drawIcon: (id: number) => string | null
  pic: (it: ItemIcon) => string
  publish: (text: string, meta: string) => void
}
type Drawing = ReturnType<typeof beltlessSvg>
interface FlatView {
  data: FlatResult
  placement: ReturnType<typeof flatPlacement>
  drawing: Drawing
  targets: Target[]
  issues: string[]
}
const farLink = /^分拣器 (\d+) (?:起点|终点)(?:不在所连传送带上|离所连传送带 [\d.]+ m，建好时会断开)/
function warperNote(w: NonNullable<BeltlessZone['warper']> | null, home: number) {
  if (!w) return ''
  const notes = [`物流站 ${home} 存一格翘曲器（星际需求）`]
  if (w.linked) notes.push(`翘曲器带接到另外 ${w.linked} 座站`)
  if (w.own) notes.push(`${w.own} 座接不上带子，自己也存一格`)
  if (w.missed) notes.push(`${w.missed} 座接不上、也没空格放`)
  return `<li${w.missed ? ' class="err"' : ''}>${notes.join('，')}</li>`
}
export function createFlat(ctx: FlatContext) {
  let current: FlatView | null = null,
    req: FlatRequest | null = null,
    id = 0
  let copying: {
    promise: Promise<string>
    ok: (s: string) => void
    fail: (e: Error) => void
  } | null = null
  function request(params: PlanParams, preserve: boolean) {
    req = {
      type: 'beltless',
      id: ++id,
      params,
      ...(preserve ? current?.placement.arrangement() : {}),
    }
    ctx.send(req)
  }
  function generate() {
    if (copying) return
    const params = ctx.buildParams()
    ctx.setStatus('正在生成无带蓝图…')
    request(params, !!current && (req?.params.station === 'ils') === (params.station === 'ils'))
  }
  function regenerate() {
    if (!req) return Promise.reject(new Error('没有可复制的蓝图'))
    if (copying) return copying.promise
    let ok!: (s: string) => void, fail!: (e: Error) => void
    const promise = new Promise<string>((resolve, reject) => {
      ok = resolve
      fail = reject
    })
    copying = { promise, ok, fail }
    request(req.params, true)
    return promise
  }
  function publish(moved: boolean) {
    if (!current) return
    const { data } = current
    $('drawing').querySelector('.bl-free')?.toggleAttribute('hidden', moved)
    ctx.publish(
      moved ? '' : data.text,
      moved
        ? `${data.zone?.parts ? '物流站、中间产物带' : '带子区'}挪过了，复制时照现在的位置出蓝图码`
        : `${data.text.length.toLocaleString()} 字符`,
    )
  }
  function draw(keep = false) {
    if (!current) return
    if (!keep) ctx.viewer.reset()
    const box = $('drawing')
    box.classList.add('has-svg')
    box.innerHTML = current.drawing.svg
    const svg = box.querySelector('svg')!
    current.placement.attach(svg)
    ctx.viewer.attach(svg, !keep, keep)
  }
  function inspect(messageId: number, data: Inspected) {
    if (messageId !== id || !req) return
    const wait = copying
    copying = null
    if ('error' in data) {
      ctx.setStatus(`无带蓝图没生成出来：${data.error}`, true)
      wait?.fail(new Error(data.error))
      return
    }
    const keep = !!current,
      zone = data.zone,
      parts = zone?.parts
    const place =
      (keep && !parts && current?.placement.place) ||
      (zone && { side: zone.side, offset: zone.offset })
    const drawing = beltlessSvg(data.buildings, ctx.drawIcon, parts),
      issues = data.check.errors.filter((e) => !farLink.test(e))
    current = {
      data,
      drawing,
      issues,
      targets: req.params.targets.map(({ target: id, rate }) => ({ id, rate })),
      placement: flatPlacement(zone, place, publish),
    }
    if (!wait) ctx.newResult()
    if (data.check.warnings.length)
      console.info(
        '[dsp-handcraft] 无带蓝图检查提醒：\n' + data.check.warnings.map((x) => `- ${x}`).join('\n'),
      )
    if (issues.length)
      console.info('[dsp-handcraft] 无带蓝图检查：\n' + issues.map((x) => `- ${x}`).join('\n'))
    ctx.setStatus(
      zone?.shiftRejected
        ? '拖到的位置放不下（压到机器、和别的块重叠或两站太近），照原来的位置出了'
        : `无带蓝图生成好了，复制就能用；${parts ? '物流站、中间产物带可以各自拖到别处' : '带子区可以围着机器拖到别的边上'}，复制时照拖到的位置出${zone?.limitMiss ? '。宽、长上限守不住，照最接近的出了' : ''}`,
      !!zone?.shiftRejected,
    )
    ctx.resetSheet()
    for (const id of [
      'route-info',
      'sheet-alert',
      'result-details',
      'legend',
      'titleblock',
      'layer-controls',
      'tab-floors',
    ])
      $(id).hidden = true
    for (const id of ['sheet-stats', 'layer-rail', 'rail-tabs', 'tab-belts', 'sheet-foot'])
      $(id).hidden = false
    const name = (id: number) => ctx.items.get(id)?.name ?? String(id)
    draw(keep)
    $('sheet-name').textContent =
      '无带蓝图 · ' + current.targets.map((t) => `${name(t.id)} ${fmt(t.rate)}/分`).join(' + ')
    const st = drawing.stats
    $('sheet-stats').innerHTML =
      `<span><b>${st.width}×${st.height}</b>格</span><span>工厂<b>${st.factories}</b></span><span>分拣器<b>${st.sorters}</b></span><span>传送带<b>${st.belts}</b></span>`
    const onPower = keep && $('tab-power').getAttribute('aria-selected') === 'true'
    ctx.fillPowerCard(data.energy)
    ctx.railTab(onPower && !!data.energy)
    $('belt-key-list').innerHTML = drawing.items
      .map((x) => {
        const it = ctx.items.get(x.id)
        return `<li><i style="--c:${x.color}"></i>${it ? ctx.pic(it) : ''}<span>${esc(name(x.id))}</span></li>`
      })
      .join('')
    $('legend').innerHTML = ''
    $('legend').hidden = false
    $('factory-legend').innerHTML = drawing.groups
      .map(
        (g) =>
          `<span><b>${g.letter}</b>${esc(ctx.items.get(g.product)?.name ?? '')} <small>×${g.count}${g.levels > 1 ? ` 叠×${g.levels} 层` : ''}</small></span>`,
      )
      .join('')
    $('sheet-tools')
      .querySelectorAll('button')
      .forEach((b) => (b.disabled = false))
    $('floor-name').textContent = '无带蓝图'
    $('floor-description').textContent = parts
      ? '物流站、中间产物带可以各自拖'
      : '带子区可以围着机器拖'
    $('floor-meta').textContent = `${st.width} × ${st.height} 格`
    $('notes').closest<HTMLElement>('.panel')!.hidden = true
    const list = (ids: number[]) => ids.map((id) => esc(name(id))).join('、')
    const stations = zone?.stations
    $('ports').innerHTML = stations
      ? stations
          .map(({ items }, i) => {
            const ids = (kind: string) =>
              items.filter((it) => it.kind === kind).map((it) => it.itemId)
            return `<li>物流站 ${i + 1}：${[ids('in').length ? `需求 ${list(ids('in'))}` : '', ids('out').length ? `供应 ${list(ids('out'))}` : ''].filter(Boolean).join('，')}</li>`
          })
          .join('') + warperNote(zone!.warper, stations.findIndex((st) => st.warper) + 1)
      : (zone?.stationSkip
          ? `<li class="err">${zone.stationSkip === 'spray' ? '喷了增产剂的线还接不了物流站（喷涂机和增产剂带要跟着挪）' : '物流站接不上'}，带子区的口照原样留着</li>`
          : '') +
        ([
          drawing.ends.in.length
            ? `<li>原料从带子区这几条带的带头送进来：${list(drawing.ends.in)}</li>`
            : '',
          drawing.ends.out.length ? `<li>产物从带尾出来：${list(drawing.ends.out)}</li>` : '',
        ].join('') || '<li>没有标出进出口的带子</li>')
    publish(current.placement.moved())
    wait?.ok(data.text)
  }
  return {
    get current() {
      return current
    },
    clear() {
      current = null
    },
    draw,
    inspect,
    generate,
    regenerate,
    drag: {
      grab: (el: Element) => current?.placement.grab(el) ?? false,
      move: (x: number, y: number) => current?.placement.move(x, y),
      end: (ok: boolean) => current?.placement.end(ok),
    },
  }
}
