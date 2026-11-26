const STEPS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.5]
export type ZoomAction = 'in' | 'out' | 'reset' | 'fit'
export interface ZoomMemory {
  value: number
}
type Pan = { id: number; x: number; y: number; left: number; top: number; moved: boolean }
interface GestureEvent extends Event {
  scale: number
  clientX: number
  clientY: number
}

// Coordinates are CSS pixels on the unscaled stage. Only the scroll frame and its
// numeric transform are imperative, so pointer and pinch motion never rerender the graph.
export function bindViewport(
  cv: HTMLDivElement,
  wrap: HTMLDivElement,
  stage: HTMLDivElement,
  host: HTMLElement,
  memory: ZoomMemory,
  showZoom: (z: number) => void,
) {
  const events = new AbortController()
  const { signal } = events
  let pan: Pan | null = null,
    suppress = false,
    resetClick: ReturnType<typeof setTimeout> | undefined
  let pinch: number | null = null,
    anchor: { id: string; x: number; y: number } | null = null,
    initial = true
  const size = () => {
    wrap.style.width = `${parseFloat(stage.style.width) * memory.value}px`
    wrap.style.height = `${parseFloat(stage.style.height) * memory.value}px`
    stage.style.transform = memory.value === 1 ? '' : `scale(${memory.value})`
  }
  const zoom = (n: number, fx = cv.clientWidth / 2, fy = cv.clientHeight / 2) => {
    const z = Math.min(STEPS.at(-1)!, Math.max(STEPS[0]!, n))
    const x = (cv.scrollLeft + fx - wrap.offsetLeft) / memory.value,
      y = (cv.scrollTop + fy - wrap.offsetTop) / memory.value
    memory.value = z
    size()
    showZoom(z)
    cv.scrollLeft = wrap.offsetLeft + x * z - fx
    cv.scrollTop = wrap.offsetTop + y * z - fy
  }
  const step = (dir: number, fx?: number, fy?: number) =>
    zoom(
      dir > 0
        ? (STEPS.find((z) => z > memory.value + 1e-6) ?? STEPS.at(-1)!)
        : (STEPS.findLast((z) => z < memory.value - 1e-6) ?? STEPS[0]!),
      fx,
      fy,
    )
  const action = (how: ZoomAction) => {
    if (how === 'in' || how === 'out') return step(how === 'in' ? 1 : -1)
    if (how === 'reset') return zoom(1)
    zoom(
      Math.min(
        1,
        cv.clientWidth / parseFloat(stage.style.width),
        cv.clientHeight / parseFloat(stage.style.height),
      ),
    )
    cv.scrollLeft = 0
    cv.scrollTop = cv.scrollHeight
  }
  const point = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = cv.getBoundingClientRect()
    return [e.clientX - r.left - cv.clientLeft, e.clientY - r.top - cv.clientTop]
  }
  cv.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      const [x, y] = point(e)
      if (
        !(e.target instanceof Node && stage.contains(e.target)) &&
        (x >= cv.clientWidth || y >= cv.clientHeight)
      )
        return
      suppress = false
      pan = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        left: cv.scrollLeft,
        top: cv.scrollTop,
        moved: false,
      }
    },
    { signal },
  )
  const end = (e: PointerEvent) => {
    if (!pan || e.pointerId !== pan.id) return
    if (pan.moved) {
      cv.classList.remove('is-panning')
      suppress = true
      clearTimeout(resetClick)
      resetClick = setTimeout(() => {
        suppress = false
      })
    }
    pan = null
  }
  cv.addEventListener(
    'pointermove',
    (e) => {
      if (!pan || e.pointerId !== pan.id) return
      if (!(e.buttons & 1)) return end(e)
      const dx = e.clientX - pan.x,
        dy = e.clientY - pan.y
      if (!pan.moved) {
        if (Math.hypot(dx, dy) <= 4) return
        pan.moved = true
        cv.setPointerCapture(e.pointerId)
        cv.classList.add('is-panning')
      }
      cv.scrollLeft = pan.left - dx
      cv.scrollTop = pan.top - dy
    },
    { signal },
  )
  cv.addEventListener('pointerup', end, { signal })
  cv.addEventListener('pointercancel', end, { signal })
  cv.addEventListener('dragstart', (e) => e.preventDefault(), { signal })
  cv.addEventListener(
    'wheel',
    (e) => {
      if (!(e.ctrlKey || e.metaKey) || pinch != null) return
      e.preventDefault()
      const [fx, fy] = point(e)
      if (e.deltaMode || Math.abs(e.deltaY) >= 50) step(-Math.sign(e.deltaY), fx, fy)
      else zoom(memory.value * Math.exp(-e.deltaY * 0.01), fx, fy)
    },
    { passive: false, signal },
  )
  cv.addEventListener(
    'gesturestart',
    (e) => {
      e.preventDefault()
      pinch = memory.value
    },
    { passive: false, signal },
  )
  cv.addEventListener(
    'gesturechange',
    (event) => {
      if (pinch == null) return
      event.preventDefault()
      const e = event as GestureEvent
      zoom(pinch * e.scale, ...point(e))
    },
    { passive: false, signal },
  )
  cv.addEventListener(
    'gestureend',
    () => {
      pinch = null
    },
    { signal },
  )
  host.addEventListener(
    'keydown',
    (e) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        !(e.target instanceof Element) ||
        !e.target.closest('.tree-canvas,.tree-tools')
      )
        return
      if (e.key === '+' || e.key === '=') step(1)
      else if (e.key === '-' || e.key === '_') step(-1)
      else if (e.key === '0') zoom(1)
      else return
      e.preventDefault()
    },
    { signal },
  )
  return {
    action,
    anchor(b: HTMLButtonElement) {
      if (suppress) return false
      anchor = {
        id: b.dataset.id!,
        x: wrap.offsetLeft + b.offsetLeft * memory.value - cv.scrollLeft,
        y: wrap.offsetTop + b.offsetTop * memory.value - cv.scrollTop,
      }
      return true
    },
    place(width: number, height: number, goalX: number) {
      const left = cv.scrollLeft,
        top = cv.scrollTop
      stage.style.width = `${width}px`
      stage.style.height = `${height}px`
      size()
      cv.style.height = `${height + cv.offsetHeight - cv.clientHeight}px`
      const hit = anchor && stage.querySelector<HTMLButtonElement>(`.xt[data-id="${anchor.id}"]`)
      if (anchor && hit) {
        cv.scrollLeft = wrap.offsetLeft + hit.offsetLeft * memory.value - anchor.x
        cv.scrollTop = wrap.offsetTop + hit.offsetTop * memory.value - anchor.y
      } else if (initial) {
        cv.scrollLeft = wrap.offsetLeft + goalX * memory.value - cv.clientWidth / 2
        cv.scrollTop = cv.scrollHeight
      } else {
        cv.scrollLeft = left
        cv.scrollTop = top
      }
      anchor = null
      initial = false
    },
    dispose() {
      events.abort()
      clearTimeout(resetClick)
    },
  }
}
