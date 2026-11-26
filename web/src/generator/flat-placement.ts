import {
  nearestPlace,
  partsFit,
  placeZone,
  turn,
  type XY,
  type ZonePlacement,
} from '../../../src/beltless/perimeter.js'
import type { BeltlessZone } from '../../../src/beltless/repack.js'

/** Translate the independent station blocks, or rotate a single belt zone along the factory perimeter. */
export function flatPlacement(
  zone: BeltlessZone | null,
  initial: ZonePlacement | null,
  onMoved: (moved: boolean) => void,
) {
  const moves: XY[] | undefined = zone?.parts?.map(() => [0, 0])
  let place = initial,
    svg: SVGSVGElement | null = null
  let drag: { part: number; delta: XY } | { center: XY; place: ZonePlacement } | null = null
  const moved = () =>
    moves
      ? moves.some(([x, y]) => !!(x || y))
      : !!(zone && place && (zone.side !== place.side || zone.offset !== place.offset))
  const partAt = (i: number) => svg?.querySelector(`[data-part="${i}"]`)
  const shift = (i: number, [x, y]: XY) =>
    partAt(i)?.setAttribute('transform', `translate(${x} ${-y})`)
  let paintZone: (p: ZonePlacement) => void = () => {}
  function attach(next: SVGSVGElement) {
    svg = next
    if (moves) {
      moves.forEach((d, i) => shift(i, d))
      return
    }
    const body = svg.querySelector('.bl-zone'),
      frame = body?.querySelector('rect[stroke-dasharray]')
    if (!zone || !body || !frame) return
    const label = svg.querySelector('.bl-zone-marks > text')
    const icons = [...svg.querySelectorAll('.bl-zone-marks > g')].flatMap((el) => {
      const match = /translate\(([-\d.]+) ([-\d.]+)\)(.*)/.exec(el.getAttribute('transform') ?? '')
      return match ? [{ el, x: Number(match[1]), y: Number(match[2]), rest: match[3] }] : []
    })
    const [fx, fy, w, h] = ['x', 'y', 'width', 'height'].map((k) => Number(frame.getAttribute(k)))
    const a = placeZone(zone.zone, zone.machines, zone.side, zone.offset)
    const round = (n: number) => Math.round(n * 1000) / 1000
    paintZone = (p) => {
      const b = placeZone(zone.zone, zone.machines, p.side, p.offset)
      const transform = (x: number, y: number): XY => {
        const [u, v] = turn(b.k - a.k, [x - a.tx, -y - a.ty])
        return [u + b.tx, -(v + b.ty)]
      }
      const [e, c1, c2] = [transform(0, 0), transform(1, 0), transform(0, 1)]
      body.setAttribute(
        'transform',
        `matrix(${c1[0] - e[0]} ${c1[1] - e[1]} ${c2[0] - e[0]} ${c2[1] - e[1]} ${round(e[0])} ${round(e[1])})`,
      )
      for (const { el, x, y, rest } of icons) {
        const [u, v] = transform(x, y)
        el.setAttribute('transform', `translate(${round(u)} ${round(v)})${rest}`)
      }
      const corners = [
        transform(fx, fy),
        transform(fx + w, fy),
        transform(fx, fy + h),
        transform(fx + w, fy + h),
      ]
      label?.setAttribute('x', String(round(Math.min(...corners.map(([x]) => x)))))
      label?.setAttribute(
        'y',
        String(
          round(
            p.side === 'bottom'
              ? Math.max(...corners.map(([, y]) => y)) + 0.85
              : Math.min(...corners.map(([, y]) => y)) - 0.35,
          ),
        ),
      )
    }
    if (place) paintZone(place)
  }
  function grab(el: Element) {
    if (!zone || !svg) return false
    if (moves) {
      const g = el.closest<SVGGElement>('.bl-part')
      if (!g) return false
      const part = Number(g.dataset.part)
      drag = { part, delta: moves[part] }
      return true
    }
    if (!place || !el.closest('.bl-zone,.bl-zone-marks')) return false
    const { box } = placeZone(zone.zone, zone.machines, place.side, place.offset)
    drag = { center: [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2], place }
    return true
  }
  function move(dx: number, dy: number) {
    if (!drag || !zone) return
    if ('part' in drag) {
      if (!moves || !zone.parts) return
      const i = drag.part,
        d: XY = [moves[i][0] + Math.round(dx), moves[i][1] - Math.round(dy)]
      if (d[0] === drag.delta[0] && d[1] === drag.delta[1]) return
      const parts = zone.parts.map((p, j) => {
        const [x, y] = j === i ? d : moves[j]
        return {
          box: { x0: p.box.x0 + x, x1: p.box.x1 + x, y0: p.box.y0 + y, y1: p.box.y1 + y },
          center: p.center && ([p.center[0] + x, p.center[1] + y] as XY),
        }
      })
      if (
        !partsFit(
          parts.map((p) => p.box),
          parts.map((p) => p.center),
          zone.machines,
          zone.span,
        )
      )
        return
      drag.delta = d
      shift(i, d)
    } else {
      const p = nearestPlace(zone.zone, zone.machines, drag.center[0] + dx, drag.center[1] - dy)
      if (p.side !== drag.place.side || p.offset !== drag.place.offset) {
        drag.place = p
        paintZone(p)
      }
    }
  }
  function end(commit: boolean) {
    const live = drag
    drag = null
    if (!live) return
    if ('part' in live && moves) {
      if (commit) moves[live.part] = live.delta
      else shift(live.part, moves[live.part])
    } else if ('place' in live) {
      if (commit) place = live.place
      else if (place) paintZone(place)
    }
    onMoved(moved())
  }
  function arrangement() {
    if (moves && zone?.parts)
      return {
        partShift: zone.parts.map((p, i): XY => [
          (p.shift?.[0] ?? 0) + moves[i][0],
          (p.shift?.[1] ?? 0) + moves[i][1],
        ]),
      }
    return place ? { zoneAt: place } : {}
  }
  return {
    attach,
    grab,
    move,
    end,
    arrangement,
    moved,
    get place() {
      return place
    },
  }
}
