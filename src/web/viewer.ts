import type { Point } from './types/drawing.js'
export interface Camera extends Point {
  zoom: number
}
interface Rect extends Point {
  width: number
  height: number
}
interface Pointer extends Point {
  start: Point
  moved: boolean
  run?: string | null
  station?: string | null
  factory?: string | null
  machine?: string | null
  button: number
  grab: boolean
}
export interface ViewerOptions {
  box: HTMLElement
  enabled: () => boolean
  onSelect: (run: string) => void
  onFactory: (hint: string) => void
  onStation?: (station: number) => void
  onMachine?: (machine: string) => void
  onClear: () => void
  onZoom: (percent: number) => void
  zoomable?: () => boolean
  drag?: {
    grab(element: Element): boolean
    move(dx: number, dy: number): void
    end(commit: boolean): void
  } | null
}
export interface Viewer {
  attach(element: SVGSVGElement | null, reset?: boolean, keepScale?: boolean): void
  fit(): void
  zoomBy(factor: number, anchor?: Point): void
  refresh(): void
  reset(): void
  dispose(): void
  destroy(): void
}
// SVG 视口：坐标保持原样，仅改变观察范围；触控与鼠标共用相机。
// 平时（预览）滚轮和触屏都交给页面滚动（不然往下滑页面时图会跟着放大），
// 只有「大图」铺满时滚轮、双指才缩放；按钮、键盘缩放和鼠标拖动平移任何时候都能用。
// drag：图上能整块拖的东西（无带蓝图的带子区）。grab(按下的元素) 说按在上面了没有，按住拖时 move(dx, dy) 给离按下时挪了多少（图上的单位），
// 松开 end(true)，两指、取消时 end(false)
export function zoomAround(
  camera: Camera,
  factor: number,
  anchor: Point,
  width: number,
  height: number,
  fitScale: number,
) {
  const next = Math.min(24, Math.max(0.35, camera.zoom * factor))
  const before = fitScale * camera.zoom,
    after = fitScale * next
  return {
    x: camera.x + (anchor.x - width / 2) * (1 / before - 1 / after),
    y: camera.y + (anchor.y - height / 2) * (1 / before - 1 / after),
    zoom: next,
  }
}

export function createViewer({
  box,
  enabled,
  onSelect,
  onFactory,
  onStation = () => {},
  onMachine = () => {},
  onClear,
  onZoom,
  zoomable = () => true,
  drag = null,
}: ViewerOptions): Viewer {
  const controller = new AbortController()
  const { signal } = controller
  let svg: SVGSVGElement | null = null,
    base: Rect | null = null,
    camera: Camera | null = null
  const pointers = new Map<number, Pointer>()
  const fitScale = () =>
    !base
      ? 1
      : Math.max(
          0.01,
          Math.min((box.clientWidth - 36) / base.width, (box.clientHeight - 36) / base.height),
        )
  const local = (event: MouseEvent) => {
    const rect = box.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  function refresh() {
    if (!enabled() || !svg || !camera || !box.clientWidth || !box.clientHeight) return
    const scale = fitScale() * camera.zoom
    const width = box.clientWidth / scale,
      height = box.clientHeight / scale
    svg.setAttribute(
      'viewBox',
      `${camera.x - width / 2} ${camera.y - height / 2} ${width} ${height}`,
    )
    svg.style.width = `${box.clientWidth}px`
    svg.style.height = `${box.clientHeight}px`
    onZoom(Math.round(camera.zoom * 100))
  }
  function fit() {
    if (!base) return
    camera = { x: base.x + base.width / 2, y: base.y + base.height / 2, zoom: 1 }
    refresh()
  }
  function zoomBy(factor: number, anchor = { x: box.clientWidth / 2, y: box.clientHeight / 2 }) {
    if (!camera || !enabled()) return
    camera = zoomAround(camera, factor, anchor, box.clientWidth, box.clientHeight, fitScale())
    refresh()
  }
  function pan(dx: number, dy: number) {
    if (!camera) return
    const scale = fitScale() * camera.zoom
    camera.x -= dx / scale
    camera.y -= dy / scale
    refresh()
  }
  box.addEventListener(
    'wheel',
    (e) => {
      if (!enabled() || !svg || !zoomable()) return // 预览时不拦滚轮，页面照常滚动
      e.preventDefault()
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? box.clientHeight : 1)
      zoomBy(Math.exp(-Math.max(-150, Math.min(150, delta)) * 0.003), local(e))
    },
    { passive: false, signal },
  )
  box.addEventListener(
    'pointerdown',
    (e) => {
      if (!enabled() || !svg || ![0, 1].includes(e.button)) return
      if (e.pointerType === 'touch' && !zoomable()) return // 预览时手指滑动是滚页面
      e.preventDefault()
      box.focus({ preventScroll: true })
      const point = local(e)
      // 按在工厂上（储物仓、储液罐也画成 factory）记下它的介绍，就是悬停提示 <title> 那段字
      if (!(e.target instanceof Element)) return
      const factory = e.target.closest('.factory')?.querySelector('title')?.textContent
      const station = e.target.closest('[data-station]')?.getAttribute('data-station') // 按在物流站上：页面开站的简介
      const machine = e.target.closest('[data-machine]')?.getAttribute('data-machine') // 按在工厂上：页面开工厂的小窗
      const grab = !pointers.size && e.button === 0 && !!drag?.grab(e.target)
      pointers.set(e.pointerId, {
        ...point,
        start: point,
        moved: false,
        run: e.target.closest('[data-route-run]')?.getAttribute('data-route-run'),
        factory,
        station,
        machine,
        button: e.button,
        grab,
      })
      if (pointers.size > 1)
        for (const p of pointers.values()) {
          p.moved = true
          if (p.grab) {
            p.grab = false
            drag?.end(false)
          }
        }
      box.setPointerCapture(e.pointerId)
      box.classList.add(grab ? 'is-dragging' : 'is-panning')
    },
    { signal },
  )
  box.addEventListener(
    'pointermove',
    (e) => {
      const p = pointers.get(e.pointerId)
      if (!p || !enabled() || !camera) return
      const before = [...pointers.values()].map((q) => ({ x: q.x, y: q.y }))
      const point = local(e),
        dx = point.x - p.x,
        dy = point.y - p.y
      Object.assign(p, point)
      if (Math.hypot(p.x - p.start.x, p.y - p.start.y) > 4) p.moved = true
      if (pointers.size === 1) {
        if (p.moved && p.grab) {
          const scale = fitScale() * camera.zoom
          drag?.move((p.x - p.start.x) / scale, (p.y - p.start.y) / scale)
        } else if (p.moved) pan(dx, dy)
      } else if (pointers.size === 2) {
        const after = [...pointers.values()]
        const center = (v: Point[]) => ({ x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 })
        const distance = (v: Point[]) => Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y)
        const a = center(before),
          b = center(after)
        if (distance(before) > 1) zoomBy(distance(after) / distance(before), a)
        pan(b.x - a.x, b.y - a.y)
      }
    },
    { signal },
  )
  function release(e: PointerEvent, cancelled = false) {
    const p = pointers.get(e.pointerId)
    if (!p) return
    pointers.delete(e.pointerId)
    if (box.hasPointerCapture(e.pointerId)) box.releasePointerCapture(e.pointerId)
    if (!pointers.size) box.classList.remove('is-panning', 'is-dragging')
    if (p.grab) drag?.end(!cancelled)
    if (cancelled || p.moved || p.button !== 0) return
    if (p.run) onSelect(p.run)
    else if (p.station != null) onStation(Number(p.station))
    else if (p.machine) onMachine(p.machine)
    else if (p.factory) onFactory(p.factory)
    else onClear()
  }
  box.addEventListener('pointerup', (e) => release(e), { signal })
  box.addEventListener('pointercancel', (e) => release(e, true), { signal })
  box.addEventListener('lostpointercapture', (e) => release(e, true), { signal })
  box.addEventListener(
    'keydown',
    (e) => {
      if (!enabled() || !svg) return
      if (!(e.target instanceof Element)) return
      const run = e.target.closest('[data-route-run]')?.getAttribute('data-route-run')
      if (run && ['Enter', ' '].includes(e.key)) {
        e.preventDefault()
        onSelect(run)
        return
      }
      if (
        [
          '+',
          '=',
          '-',
          '0',
          'Home',
          'Escape',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
        ].includes(e.key)
      )
        e.preventDefault()
      if (['+', '='].includes(e.key)) zoomBy(1.25)
      else if (e.key === '-') zoomBy(0.8)
      else if (['0', 'Home'].includes(e.key)) fit()
      else if (e.key === 'Escape') onClear()
      else if (e.key === 'ArrowLeft') pan(50, 0)
      else if (e.key === 'ArrowRight') pan(-50, 0)
      else if (e.key === 'ArrowUp') pan(0, 50)
      else if (e.key === 'ArrowDown') pan(0, -50)
    },
    { signal },
  )
  function reset() {
    const grabbed = [...pointers.values()].some((p) => p.grab)
    const captured = [...pointers.keys()]
    pointers.clear()
    for (const id of captured) if (box.hasPointerCapture(id)) box.releasePointerCapture(id)
    box.classList.remove('is-panning', 'is-dragging')
    svg = null
    base = null
    camera = null
    if (grabbed) drag?.end(false)
  }
  function dispose() {
    controller.abort()
    reset()
  }
  return {
    /** keepScale：图的范围变了也照原来的比例画（换上同一张图更新过的样子时用） */
    attach(element, reset = false, keepScale = false) {
      if (signal.aborted || !element) return
      const scale = keepScale && camera && base ? fitScale() * camera.zoom : 0
      svg = element
      const b = svg.viewBox.baseVal
      base = { x: b.x, y: b.y, width: b.width, height: b.height }
      if (!camera || reset) fit()
      else {
        if (scale) camera.zoom = scale / fitScale()
        refresh()
      }
    },
    fit,
    zoomBy,
    refresh,
    reset,
    dispose,
    destroy: dispose,
  }
}
