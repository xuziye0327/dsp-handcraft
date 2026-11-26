import { drawingSvg, linkedRuns, routeColor, LINE } from '../drawing.js'
import * as details from './sheet-details'
import { createStation } from './sheet-inspector'
import type { Cell, FloorLevel, SheetContext, SheetEnergy, SheetResult } from './sheet-types'
import { element as $, esc, fmt } from './sheet-ui'
export type * from './sheet-types'
export type { SheetResult as PlanResult } from './sheet-types'
export { fmt }

export function createSheet(ctx: SheetContext) {
  const controller = new AbortController()
  const signal = controller.signal
  const station = createStation(ctx, signal)
  const floorAt = (z: number) => ctx.floors.find((f) => f.z === z)
  const box = $('drawing')
  $('sheet-stats').addEventListener(
    'click',
    (event) => {
      if (event.target instanceof Element && event.target.closest('button.warn'))
        $('notes').scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    { signal },
  )
  function railTab(power: boolean) {
    for (const [tab, page, on] of [
      ['tab-floors', 'floor-list', !power && !ctx.flat],
      ['tab-belts', 'belt-key', !power && !!ctx.flat],
      ['tab-power', 'power-pane', power],
    ] as const) {
      $(tab).setAttribute('aria-selected', String(on))
      $(page).hidden = !on
    }
  }
  function renderFloorNav(d: SheetResult) {
    for (const id of ['layer-controls', 'layer-rail', 'tab-floors', 'sheet-foot', 'result-details'])
      $(id).hidden = false
    $('tab-belts').hidden = true
    railTab(false)
    const panel = $('notes').closest<HTMLElement>('.panel')
    if (panel) panel.hidden = false
    $('sheet-tools')
      .querySelectorAll('button')
      .forEach((b) => (b.disabled = false))
    const cards = [
      {
        z: 'all' as const,
        name: '总览',
        count: ctx.floors.reduce((sum, f) => sum + f.cells.size, 0),
      },
      ...ctx.floors.map((f) => ({ z: f.z, name: `L${f.z + 1}`, count: f.cells.size })),
    ]
    $('floor-list').innerHTML = cards
      .map(
        ({ z, name, count }) =>
          `<button type="button" class="floor-card" data-floor="${z}" aria-pressed="${z === ctx.view.level}" aria-label="${name}，${count} 个带格"><span class="floor-info"><strong>${name}</strong><small>${count ? `${count} 格` : '空'}</small></span><span class="floor-thumb">${drawingSvg(d.model, ctx.floors, { level: z, mini: true, id: `floor-${z}` })}</span></button>`,
      )
      .join('')
  }
  function showRouteInfo() {
    const { view, last: d } = ctx
    const [z = -1, idx = -1] = view.selected.split(':').map(Number)
    const floor = floorAt(z),
      run = view.selected && floor?.runs[idx]
    const info = $('route-info')
    info.hidden = !run && !view.factory
    if (view.factory) {
      const [name = '', ...rest] = view.factory.split(' · ')
      $('route-title').textContent = name
      info.style.setProperty('--route-color', LINE)
      $('route-body').innerHTML = rest.map((s) => `<p>${esc(s)}</p>`).join('')
      return
    }
    if (!d || !floor || !run) return
    const { model } = d,
      item = model.items[run.itemId]
    if (!item) return
    const point = ([x, y]: Cell) => `(${x + (model.origin?.x ?? 0)}, ${y + (model.origin?.y ?? 0)})`
    const factories = (io: string) => [
      ...new Set(
        model.sorters
          .filter((s) => s.itemId === run.itemId && s.io === io)
          .map((s) => s.factoryItem)
          .filter(Boolean),
      ),
    ]
    const sources = factories('out'),
      consumers = factories('in')
    const vias = floor.vias.filter(
      (v) => v.itemId === run.itemId && run.cells.some(([x, y]) => x === v.x && y === v.y),
    )
    const after = ctx.floors.flatMap((f) => f.runs).find((r) => r.prev === run)
    const nextLevels = new Set(vias.map((v) => v.to))
    if ((run.from || run.prev?.to) && run.prev) nextLevels.add(run.prev.z)
    if ((run.to || after?.from) && after) nextLevels.add(after.z)
    const levels = [...nextLevels].map((l) => `L${l + 1}`)
    $('route-title').textContent = item.name
    info.style.setProperty('--route-color', routeColor(model, run.itemId))
    const line = (label: string, value: string) => `<dt>${label}</dt><dd>${esc(value)}</dd>`
    $('route-body').innerHTML =
      '<dl>' +
      line(
        '当前线段',
        `L${z + 1} · ${run.cells.length} 格${levels.length ? ` · 接 ${levels.join('、')}` : ''}`,
      ) +
      line('输送方向', `${point(run.cells[0]!)} → ${point(run.cells.at(-1)!)}`) +
      line('产线总量', `${fmt(item.rate)}/分`) +
      line(
        '物料来源',
        sources.length
          ? sources.map((n) => `${n}产线`).join('、')
          : model.stations.length
            ? '物流站输入'
            : '外部输入',
      ) +
      line('用于生产', consumers.length ? consumers.join('、') : '成品送出') +
      '</dl>'
  }
  function drawSheet(d: SheetResult) {
    const { view, floors } = ctx,
      level = view.level
    box.classList.add('has-svg')
    const shown = level === 'all' ? floors : floors.filter((f) => f.z === level)
    const count = shown.reduce((n, f) => n + f.cells.size, 0),
      name = level === 'all' ? '总览' : `L${level + 1}`
    $('floor-name').textContent = name
    $('floor-description').textContent =
      level === 'all'
        ? '实线地面 · 虚线高架'
        : `${level === 0 ? '地面' : '高架'} · z=${level}${linkedRuns(floors, level).length ? ' · 虚线：别的层' : ''}`
    $('floor-meta').textContent =
      `${d.model.rotated ? d.model.height : d.model.width} × ${d.model.rotated ? d.model.width : d.model.height} 格 · ${count} 带格`
    box.innerHTML = drawingSvg(d.model, floors, {
      ...view,
      label: `${d.title ?? d.target} · ${name} 布线图`,
      icon: ctx.drawIcon,
    })
    $('floor-list')
      .querySelectorAll<HTMLButtonElement>('[data-floor]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.floor === String(level))))
    const svg = box.querySelector('svg')
    if (svg) ctx.viewer.attach(svg)
    showRouteInfo()
  }
  function selectRoute(id: string) {
    if (ctx.busy || !ctx.last) return
    const [z = -1, index = -1] = id.split(':').map(Number),
      run = floorAt(z)?.runs[index]
    if (!run) return
    Object.assign(ctx.view, { selected: id, focus: String(run.itemId), factory: '' })
    drawSheet(ctx.last)
    box.focus({ preventScroll: true })
  }
  function selectFactory(hint: string) {
    if (ctx.busy || !ctx.last) return
    ctx.view.factory = hint
    if (!ctx.view.selected) return showRouteInfo()
    ctx.view.selected = ''
    ctx.view.focus = ''
    drawSheet(ctx.last)
  }
  function clearRoute() {
    const { view } = ctx
    $('route-info').hidden = true
    view.factory = ''
    if (view.station != null || view.machine != null) {
      view.station = null
      view.machine = null
      station.renderStation()
    }
    if (!view.selected) return
    view.selected = ''
    view.focus = ''
    if (ctx.last && !ctx.busy) drawSheet(ctx.last)
  }
  const applyZoom = () => ctx.viewer.refresh()
  function expandViewer(expanded: boolean) {
    $('sheet').classList.toggle('is-expanded', expanded)
    document.body.classList.toggle('viewer-expanded', expanded)
    const b = $('expand-view')
    b.textContent = expanded ? '退出大图' : '大图'
    b.setAttribute('aria-pressed', String(expanded))
    applyZoom()
  }
  $('tab-floors').addEventListener('click', () => railTab(false), { signal })
  $('tab-belts').addEventListener('click', () => railTab(false), { signal })
  $('tab-power').addEventListener('click', () => railTab(true), { signal })
  window.addEventListener('resize', applyZoom, { signal })
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(applyZoom)
    observer.observe(box)
    signal.addEventListener('abort', () => observer.disconnect(), { once: true })
  }
  document
    .querySelectorAll('[data-zoom]')
    .forEach((b) => b.addEventListener('click', () => ctx.viewer.fit(), { signal }))
  $('zoom-in').addEventListener('click', () => ctx.viewer.zoomBy(1.25), { signal })
  $('zoom-out').addEventListener('click', () => ctx.viewer.zoomBy(0.8), { signal })
  $('expand-view').addEventListener(
    'click',
    () => expandViewer(!$('sheet').classList.contains('is-expanded')),
    { signal },
  )
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return
      if ($('sheet').classList.contains('is-expanded')) {
        e.preventDefault()
        e.stopPropagation()
        expandViewer(false)
        $('expand-view').focus()
      } else clearRoute()
    },
    { capture: true, signal },
  )
  $('floor-list').addEventListener(
    'click',
    (e) => {
      const b =
        e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-floor]') : null
      if (!b || !ctx.last || ctx.busy) return
      const level: FloorLevel = b.dataset.floor === 'all' ? 'all' : Number(b.dataset.floor)
      Object.assign(ctx.view, { level, selected: '', focus: '', factory: '' })
      drawSheet(ctx.last)
    },
    { signal },
  )
  $('floor-list').addEventListener(
    'keydown',
    (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
      const buttons = Array.from($('floor-list').querySelectorAll('button')),
        target = e.target instanceof Element ? e.target.closest('button') : null
      if (!target) return
      const i = buttons.indexOf(target)
      if (i < 0) return
      e.preventDefault()
      const next =
        buttons[
          e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? buttons.length - 1
              : (i + (['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : 1) + buttons.length) %
                buttons.length
        ]
      next?.focus()
      next?.click()
    },
    { signal },
  )
  $('close-route').addEventListener('click', clearRoute, { signal })
  $('layer-controls').addEventListener(
    'change',
    (e) => {
      const el = e.target
      if (!(el instanceof HTMLInputElement) || !ctx.last || ctx.busy) return
      const key = el.dataset.overlay
      if (key !== 'buildings' && key !== 'power' && key !== 'sorters') return
      ctx.view[key] = el.checked
      if (!ctx.view.buildings) ctx.view.factory = ''
      drawSheet(ctx.last)
    },
    { signal },
  )
  return {
    ...station,
    ...details,
    fillTitleBlock: (d: SheetResult) => details.fillTitleBlock(ctx, d),
    fillPorts: (d: SheetResult) => details.fillPorts(ctx, d),
    fillPowerCard: (e?: SheetEnergy | null) => details.fillPowerCard(e, railTab),
    railTab,
    renderFloorNav,
    drawSheet,
    showRouteInfo,
    clearRoute,
    selectRoute,
    selectFactory,
    applyZoom,
    expandViewer,
    dispose: () => controller.abort(),
  }
}
