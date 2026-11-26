import { footprint } from '../drawing.js'
import type { MachineGroup, RecipeTile, SheetContext, SheetModel, Sorter } from './sheet-types'
import { element as $, esc, fmt } from './sheet-ui'

function machineOf(model: SheetModel, key: string) {
  const [ri = -1, gi = -1, i = -1] = key.split(':').map(Number)
  const row = model.rows[ri]
  const g = row?.groups[gi]
  const cx = g?.centers[i]
  if (!row || !g?.recipe || cx == null) return null
  const fp = footprint(g)
  const cy = row.cy + fp.dy
  const sorters = model.sorters.filter(
    (so) =>
      so.factoryItem === g.item &&
      Math.abs(so.x - cx) <= fp.w / 2 + 0.01 &&
      Math.abs(so.y0 - cy) <= fp.h / 2 + 0.5,
  )
  return { g, recipe: g.recipe, i, cx, cy, fp, sorters }
}
function numberOf(model: SheetModel, g: MachineGroup, i: number) {
  const all = model.rows.flatMap((row) =>
    row.groups
      .filter((x) => x.letter === g.letter)
      .flatMap((x) => x.centers.map((cx, j) => ({ x, j, cy: row.cy, cx }))),
  )
  all.sort((a, b) => (model.rotated ? a.cx - b.cx || a.cy - b.cy : b.cy - a.cy || a.cx - b.cx))
  return all.findIndex((q) => q.x === g && q.j === i) + 1
}
function machineDiagram(
  ctx: SheetContext,
  m: NonNullable<ReturnType<typeof machineOf>>,
  label: string,
  rotated: boolean,
) {
  const { fp, cx, cy, sorters } = m
  const ys = sorters.map((so) => so.y1 - cy)
  const top = Math.max(fp.h / 2, ...ys) + 1.1
  const bottom = Math.min(-fp.h / 2, ...ys) - 1.1
  const half = Math.max(fp.w / 2, ...sorters.map((so) => Math.abs((so.x1 ?? so.x) - cx))) + 1.1
  const parts = sorters.map((so) => {
    const title = `<title>${so.io === 'out' ? '出料' : '取料'} · ${esc(ctx.byId.get(so.itemId)?.name ?? '')}</title>`
    let path: string, arrow: string, x: number, y: number
    if (so.x1 != null) {
      y = -(so.y0 - cy)
      const edge = so.x1 > so.x ? fp.w / 2 : -fp.w / 2
      x = so.x1 - cx
      const mid = (edge + x) / 2,
        k = Math.sign(so.io === 'out' ? x - edge : edge - x) || 1
      path = `M${edge} ${y}H${x}`
      arrow = `M${mid - 0.12 * k} ${y - 0.18}L${mid + 0.1 * k} ${y}L${mid - 0.12 * k} ${y + 0.18}`
    } else {
      x = so.x - cx
      const edge = so.y1 > so.y0 ? -fp.h / 2 : fp.h / 2
      y = -(so.y1 - cy)
      const mid = (edge + y) / 2,
        k = Math.sign(so.io === 'out' ? y - edge : edge - y) || 1
      path = `M${x} ${edge}V${y}`
      arrow = `M${x - 0.18} ${mid - 0.12 * k}L${x} ${mid + 0.1 * k}L${x + 0.18} ${mid - 0.12 * k}`
    }
    return `<g>${title}<path d="${path}" stroke="#dbe8f7" stroke-width="0.09"/><path d="${arrow}" fill="none" stroke="#dbe8f7" stroke-width="0.08"/><g transform="translate(${x} ${y}) scale(1.35)">${ctx.drawIcon(so.itemId) ?? ''}</g></g>`
  })
  const W = 2 * half,
    H = top - bottom
  return `<svg class="mc-map" viewBox="${-half} ${-top} ${W} ${H}" style="aspect-ratio:${W}/${H}" aria-hidden="true"><g${rotated ? ' transform="rotate(90)"' : ''}><path d="M${-fp.w / 2} ${-fp.h / 2}h${fp.w}v${fp.h}h${-fp.w}Z" fill="#112f52" stroke="#cfe0f2" stroke-width="0.09"/>${parts.join('')}</g><text y="0.3" text-anchor="middle" font-size="0.85" fill="#e6f0ff" font-weight="500">${esc(label)}</text></svg>`
}
export function renderMachine(ctx: SheetContext) {
  const d = ctx.last
  const m = d && ctx.view.machine != null ? machineOf(d.model, ctx.view.machine) : null
  $('machine-info').hidden = !m
  if (!m || !d) return
  const { g, i, sorters, recipe: r } = m
  const no = numberOf(d.model, g, i)
  const primary = r.outputs[0]
  if (!primary) throw new Error(`Missing output for machine recipe ${r.name}`)
  $('machine-title').innerHTML =
    `${ctx.pic(ctx.byId.get(primary.id) ?? { name: g.item })}<span>${esc(g.item)}</span><small>${esc(g.letter)}${no}</small>`
  const tile = (x: RecipeTile, rate?: number | null) => {
    const it = ctx.byId.get(x.id) ?? { name: String(x.id) }
    return `<div class="mc-tile" title="${esc(it.name)}"><span class="mc-ico">${ctx.pic(it)}<b>×${x.count}</b></span><small>${rate != null ? `${fmt(rate)}/分` : ''}</small></div>`
  }
  const ins = r.inputs.map((x) => tile(x, x.count * (r.crafts ?? 0))).join(''),
    outs = r.outputs.map((x) => tile(x, x.rate)).join('')
  const main = r.outputs.find((x) => ctx.byId.get(x.id)?.name === g.item) ?? primary
  const count = g.groupCount ?? g.centers.length
  const levels = (g.levels ?? 1) > 1 ? `（每叠 ${g.levels} 层）` : ''
  const side = (so: Sorter) =>
    so.x1 != null ? (so.x1 > so.x ? '右边' : '左边') : so.y1 > so.y0 ? '上边' : '下边'
  const list = sorters
    .slice()
    .sort((a, b) => (a.io === b.io ? a.x - b.x : a.io === 'in' ? -1 : 1))
    .map((so) => {
      const it = ctx.byId.get(so.itemId) ?? { name: '' }
      return `<li>${ctx.pic(it)}<span>${so.io === 'out' ? `放到${side(so)}的 <b>${esc(it.name)}</b> 带上` : `从${side(so)}的 <b>${esc(it.name)}</b> 带上取`}</span><small>${so.len ? `长 ${so.len}` : ''}</small></li>`
    })
    .join('')
  const parts = 'parts' in d ? d.parts : undefined
  $('machine-body').innerHTML =
    `<p class="mc-sub">${esc(g.factory)} · 这组 ${count} 台${levels}</p><div class="mc-recipe">${ins}<span class="mc-arrow">→</span>${outs}</div>` +
    `<p class="mc-sub">${esc(r.name)} · 每次 ${fmt(r.time)} 秒 · 每台出 ${esc(g.item)} <b class="num">${fmt(main.rate ?? 0)}</b>/分，这组共 <b class="num">${fmt((main.rate ?? 0) * count)}</b>/分</p>` +
    machineDiagram(ctx, m, `${g.letter} ${no}`, !!d.model.rotated) +
    `<ul class="mc-list">${list || '<li>没有分拣器</li>'}</ul><p class="st-note">分拣器：${esc(parts?.sorter ?? '')} · 传送带：${esc(parts?.belt ?? '')}</p>`
}
