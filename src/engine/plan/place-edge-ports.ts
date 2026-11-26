import { chainTiles } from '../emit/blueprint.js'
import { powerCells } from '../gamedata.js'
import { translateLayout } from './coordinates.js'
import type { Cell, Chain, Layout, Leg, Port, Tile } from './domain.js'
import { PORT_POSITIONS, type PortPositions, type PortSide } from './port-position.js'
import { dirIndex, obstacles, pathfind } from './stations.js'

const INWARD: Record<PortSide, Cell> = {
  left: [1, 0],
  right: [-1, 0],
  top: [0, -1],
  bottom: [0, 1],
}
const sides = Object.keys(INWARD) as PortSide[]
const xy = (x: number, y: number) => `${x},${y}`
const cell = (x: number, y: number, z: number) => `${x},${y},${z}`
const verticalEdge = (side: PortSide) => side === 'left' || side === 'right'

type Connection = {
  port: Port
  leg: Leg
  end: Tile
  approach: Cell | null
  chain: Chain
  length: number
  side: PortSide
  low: boolean
}
type Limits = { maxWidth?: number | null; maxHeight?: number | null }

export function placeEdgePorts(
  layout: Layout,
  positions: PortPositions,
  outputItems: ReadonlySet<number>,
  limits: Limits,
): boolean {
  const ports = new Map(layout.ports.filter((p) => p.leg != null).map((p) => [p.leg!, p]))
  const connections: Connection[] = []
  const fixedEnds: { end: Tile; next?: Tile }[] = []
  for (const chain of layout.chains) {
    const first = ports.get(chain.parts[0]?.leg ?? -1)
    const last = ports.get(chain.parts.at(-1)?.leg ?? -1)
    const inlet = first?.kind === 'in' ? first : null
    const outlet = last?.kind === 'out' ? last : null
    if (!inlet && !outlet) continue
    const { main } = chainTiles(layout, chain)
    if (!main.length) return false
    for (const port of [inlet, outlet]) {
      if (!port) continue
      const position = positions[port.kind]
      const [end, next] = port.kind === 'in' ? [main[0], main[1]] : [main.at(-1)!, main.at(-2)]
      if (!position || port.spray || (port.kind === 'out' && !outputItems.has(port.itemId))) {
        fixedEnds.push({ end, next })
        continue
      }
      if (end[2] !== 0) return false
      const { x, y, side } = PORT_POSITIONS[position]
      const differs = ([x, y]: Tile) => x !== end[0] || y !== end[1]
      const ahead = next?.[2]
        ? port.kind === 'in'
          ? main.find(differs)
          : main.findLast(differs)
        : null
      const approach: Cell | null = ahead ? [ahead[0] - end[0], ahead[1] - end[1]] : null
      connections.push({
        port,
        leg: layout.legs[port.leg!],
        end,
        approach,
        chain,
        length: main.length,
        side,
        low: verticalEdge(side) ? y < 0 : x < 0,
      })
    }
  }
  if (!connections.length) return true

  const groups = sides.map((side) => ({
    side,
    low: connections.filter((p) => p.side === side && p.low),
    high: connections.filter((p) => p.side === side && !p.low),
  }))
  for (const { side, low, high } of groups) {
    const a = verticalEdge(side) ? 1 : 0
    low.sort((p, q) => p.end[a] - q.end[a])
    high.sort((p, q) => q.end[a] - p.end[a])
  }
  const minSpan = (vertical: boolean) =>
    Math.max(
      0,
      ...groups
        .filter(({ side }) => verticalEdge(side) === vertical)
        .map(({ low, high }) => (low.length || high.length ? low.length + high.length + 4 : 0)),
    )
  const O = obstacles(layout)
  for (const [x, y] of (layout.power?.nodes ?? []).flatMap((p) =>
    powerCells(layout.power!.itemId, p.x, p.y),
  ))
    O.solid.add(xy(x, y))
  for (const p of [...(layout.pilers ?? []), ...(layout.coaters ?? [])]) O.solid.add(xy(p.x, p.y))
  for (const pl of layout.proLines ?? []) {
    for (const t of pl.cells) O.belts.add(cell(...t))
    if (pl.edge && pl.cells.length) fixedEnds.push({ end: pl.cells[0], next: pl.cells[1] })
  }

  // Try the selected edges first, then allow an outside corridor on the other edges as well.
  for (const margin of [0, 1, 3]) {
    const pad = (side: PortSide) => (connections.some((p) => p.side === side) ? 2 + margin : margin)
    const dx = (layout.origin?.x ?? 0) + pad('left')
    const dy = (layout.origin?.y ?? 0) + pad('bottom')
    const width = Math.max(layout.width + pad('left') + pad('right'), minSpan(false))
    const height = Math.max(layout.height + pad('bottom') + pad('top'), minSpan(true))
    if (
      (limits.maxWidth && width > limits.maxWidth) ||
      (limits.maxHeight && height > limits.maxHeight)
    )
      continue
    const paths = route(width, height, dx, dy, margin > 0)
    if (!paths) continue

    const lengths = new Map<Chain, number>()
    for (const [conn, path] of paths) {
      const { leg, port, side, length, chain } = conn
      leg.extension = path
      port.side = side
      port.x = path[0][0]
      port.y = path[0][1]
      layout.belts += path.length
      layout.airBelts += path.filter((p) => p[2] > 0).length
      lengths.set(chain, (lengths.get(chain) ?? length) + path.length)
    }
    for (const [chain, length] of lengths) {
      if (length > layout.longestBelt) {
        layout.longestBelt = length
        layout.longestBeltItem = chain.itemId
      }
    }
    translateLayout(layout, dx, dy)
    delete layout.origin
    layout.width = width
    layout.height = height
    layout.area = width * height
    return true
  }
  return false

  function route(W: number, H: number, dx: number, dy: number, reverse: boolean) {
    const shiftXY = (keys: Set<string>) =>
      new Set(
        [...keys].map((k) => {
          const [x, y] = k.split(',').map(Number)
          return xy(x + dx, y + dy)
        }),
      )
    const solid = shiftXY(O.solid)
    const ground = shiftXY(O.ground)
    const belts = new Set<string>()
    for (const k of O.belts) {
      const [x, y, z] = k.split(',').map(Number)
      belts.add(cell(x + dx, y + dy, Math.floor(z)))
      belts.add(cell(x + dx, y + dy, Math.ceil(z)))
    }
    const blocked = (x: number, y: number) =>
      solid.has(xy(x, y)) || ground.has(xy(x, y)) || belts.has(cell(x, y, 0))
    // Leave a straight ground-level connection to the outside for ports still on automatic.
    const reserved = new Set<string>()
    for (const { end, next } of fixedEnds) {
      const sx = end[0] + dx
      const sy = end[1] + dy
      let shortest: string[] | null = null
      for (const [ix, iy] of Object.values(INWARD)) {
        if (next?.[0] === end[0] - ix && next[1] === end[1] - iy) continue
        let x = sx - ix
        let y = sy - iy
        const ray: string[] = []
        while (x >= 0 && x < W && y >= 0 && y < H && !blocked(x, y)) {
          ray.push(xy(x, y))
          x -= ix
          y -= iy
        }
        if ((x < 0 || x >= W || y < 0 || y >= H) && (!shortest || ray.length < shortest.length))
          shortest = ray
      }
      for (const k of shortest ?? []) reserved.add(k)
    }
    for (const k of reserved) ground.add(k)
    const work: { conn: Connection; outer: Tile; lead: Tile }[] = []
    for (const { side, low, high } of groups) {
      const vertical = verticalEdge(side)
      const bound = side === 'left' || side === 'bottom' ? 0 : vertical ? W - 1 : H - 1
      const [ix, iy] = INWARD[side]
      const span = vertical ? H : W
      const place = (group: Connection[], from: number, step: number) => {
        let i = 0
        for (let k = from; i < group.length && k >= 2 && k < span - 2; k += step) {
          const outer: Tile = vertical ? [bound, k, 0] : [k, bound, 0]
          const lead: Tile = [outer[0] + ix, outer[1] + iy, 0]
          if (blocked(outer[0], outer[1]) || blocked(lead[0], lead[1])) continue
          solid.add(xy(outer[0], outer[1]))
          solid.add(xy(lead[0], lead[1]))
          work.push({ conn: group[i++], outer, lead })
        }
        return i === group.length
      }
      if (!place(low, 2, 1) || !place(high, span - 3, -1)) return null
    }
    if (reverse) work.reverse()
    const paths = new Map<Connection, Tile[]>()
    const maxLevel = layout.noLift ? 0 : reverse ? 4 : 2
    for (const { conn, outer, lead } of work) {
      const [ix, iy] = INWARD[conn.side]
      const [ex, ey] = conn.end
      const end: Tile = [ex + dx, ey + dy, 0]
      // A sloped or vertical step in the original belt needs a straight approach.
      const [ax, ay] = conn.approach ?? [0, 0]
      const target: Tile = [end[0] - ax, end[1] - ay, 0]
      if (target[0] < 0 || target[0] >= W || target[1] < 0 || target[1] >= H) return null
      if (
        conn.approach &&
        (target[0] !== lead[0] || target[1] !== lead[1]) &&
        (solid.has(xy(target[0], target[1])) ||
          ground.has(xy(target[0], target[1])) ||
          belts.has(cell(...target)))
      )
        return null
      // The old endpoint may be entered at ground level, but must not become a new lift.
      const endKey = xy(end[0], end[1])
      const wasSolid = solid.has(endKey)
      solid.add(endKey)
      const result = pathfind(
        lead,
        target,
        { solid, ground, belts },
        W,
        H,
        maxLevel,
        dirIndex(ix, iy),
        null,
        dirIndex(ax, ay),
      )
      if (!wasSolid) solid.delete(endKey)
      if (!result) return null
      const tiles = [outer, ...result.cells]
      if (!conn.approach) tiles.pop()
      for (const t of tiles) belts.add(cell(...t))
      paths.set(
        conn,
        tiles.map(([x, y, z]) => [x - dx, y - dy, z]),
      )
    }
    return paths
  }
}
