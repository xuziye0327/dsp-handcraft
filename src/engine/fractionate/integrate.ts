import { fromStr, toStr } from '../codec/parser.ts'
import type { Blueprint, Building, Point2, Point3 } from '../codec/types.ts'
import { blockedPorts, portRays } from '../emit/check.ts'
import { narrowestEW } from '../gamedata.ts'
import { checkArray, integratedArray, SPRAY } from './array.ts'
import { collisions } from './compact.ts'
import { flowCheck } from './flow.ts'

export const HYDROGEN = 1120
export const DEUTERIUM = 1121
export const FRAC_RECIPE = 115
const STATION = 2104
const GAP = 10
const EPS = 1e-6
const CAPACITY = [0, 360, 720, 1800]

export type FractionatorFeed = { at: Point2; rate: number } & (
  | { mode: 'edge' }
  | { mode: 'station'; slot: number }
)
interface Limits {
  maxWidth?: number | null
  maxHeight?: number | null
  maxAspect?: number | null
  noLift?: boolean
}
type Array = ReturnType<typeof integratedArray>
type Coord = [x: number, y: number]
type RouteCell = [x: number, y: number, z: number]
interface Box {
  x: number
  y: number
  w: number
  h: number
}
interface Placement {
  array: Array
  box: Box
  path: RouteCell[]
  destination?: Building
  rate: number
}
const DIR: Coord[] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
]
const key = (x: number, y: number) => `${x},${y}`
const ground = (p: Point3) => Math.abs(p.z) < 0.05
const belt = (b: Building) => b.itemId >= 2001 && b.itemId <= 2003
const position = (b: Building) => b.localOffset[0]
const sameCell = (a: Point2, b: Point2) => Math.round(a.x) === b.x && Math.round(a.y) === b.y
const contains = (b: Box, x: number, y: number) =>
  x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h
const separated = (a: Box, b: Box) =>
  a.x + a.w + GAP <= b.x ||
  b.x + b.w + GAP <= a.x ||
  a.y + a.h + GAP <= b.y ||
  b.y + b.h + GAP <= a.y

function bounds(boxes: Box[]) {
  const x = Math.min(...boxes.map((b) => b.x))
  const y = Math.min(...boxes.map((b) => b.y))
  return {
    x,
    y,
    w: Math.max(...boxes.map((b) => b.x + b.w)) - x,
    h: Math.max(...boxes.map((b) => b.y + b.h)) - y,
  }
}

function fits(box: Box, limits: Limits) {
  return (
    !(limits.maxWidth && box.w > limits.maxWidth) &&
    !(limits.maxHeight && box.h > limits.maxHeight) &&
    !(limits.maxAspect && Math.max(box.w, box.h) / Math.min(box.w, box.h) > limits.maxAspect + EPS)
  )
}

const station = (array: Array) => {
  const b = array.buildings.find((b) => b.itemId === STATION)
  if (!b?.parameters?.storage || !b.parameters.slots) throw new Error('分馏阵列缺少物流站设置')
  return { b, storage: b.parameters.storage, slots: b.parameters.slots }
}

/** 齐平地面的接驳带。路径只在厂房外，进厂沿原入口可用的直线。 */
function route(start: Coord, end: Coord, bounds: Box, blocked: (x: number, y: number) => boolean) {
  const queue = [start]
  const parent = new Map<string, Coord | null>([[key(...start), null]])
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i]
    if (at[0] === end[0] && at[1] === end[1]) {
      const path = []
      for (let cur: Coord | null = at; cur; cur = parent.get(key(...cur))!) path.push(cur)
      return path.reverse()
    }
    for (const [dx, dy] of DIR) {
      const p: Coord = [at[0] + dx, at[1] + dy]
      if (!contains(bounds, ...p) || parent.has(key(...p)) || blocked(...p)) continue
      parent.set(key(...p), at)
      queue.push(p)
    }
  }
  return null
}

function candidates(array: Array, factory: Box, occupied: Box[], at: Point2) {
  const w = array.width
  const h = array.height
  const p = position(station(array).b)
  const sx = Math.round(p.x)
  const sy = Math.round(p.y)
  const all = bounds(occupied)
  const x = [
    ...new Set([
      at.x - sx,
      0,
      factory.w - w,
      -w - GAP,
      factory.w + GAP,
      all.x - w - GAP,
      all.x + all.w + GAP,
    ]),
  ]
  const y = [
    ...new Set([
      at.y - sy,
      0,
      factory.h - h,
      -h - GAP,
      factory.h + GAP,
      all.y - h - GAP,
      all.y + all.h + GAP,
    ]),
  ]
  return [
    ...[-w - GAP, factory.w + GAP, all.x - w - GAP, all.x + all.w + GAP].flatMap((x) =>
      y.map((y) => ({ x, y, w, h })),
    ),
    ...[-h - GAP, factory.h + GAP, all.y - h - GAP, all.y + all.h + GAP].flatMap((y) =>
      x.map((x) => ({ x, y, w, h })),
    ),
  ].filter((b) => occupied.every((o) => separated(b, o)))
}

function append(bp: Blueprint, buildings: Building[], x: number, y: number) {
  const offset = bp.buildings.length
  for (const b of buildings) {
    const copy = structuredClone(b)
    for (const p of copy.localOffset) {
      p.x += x
      p.y += y
    }
    copy.index += offset
    copy.areaIndex = bp.primaryAreaIdx
    if (copy.inputObjIdx >= 0) copy.inputObjIdx += offset
    if (copy.outputObjIdx >= 0) copy.outputObjIdx += offset
    bp.buildings.push(copy)
  }
  return offset
}

function addOutlet(
  buildings: Building[],
  source: Building,
  outlet: RouteCell[],
  dest: Building,
  shift: Point2,
) {
  const port = position(source)
  const parts: Point3[] = [
    { x: port.x + 2.146, y: port.y, z: 0.009 },
    ...outlet.map(([x, y, z]) => ({ x: x + shift.x, y: y + shift.y, z })),
  ]
  for (const [i, p] of parts.entries()) {
    const next = parts[i + 1] ?? position(dest)
    const dx = Math.round(next.x) - Math.round(p.x)
    const dy = Math.round(next.y) - Math.round(p.y)
    const yaw = dx > 0 ? 90 : dx < 0 ? 270 : dy > 0 ? 0 : 180
    buildings.push({
      ...dest,
      index: buildings.length,
      areaIndex: source.areaIndex,
      localOffset: [p, { ...p }],
      yaw: [yaw, yaw],
      inputObjIdx: i === 0 ? source.index : -1,
      inputFromSlot: i === 0 ? 4 : 0,
      inputToSlot: 1,
      outputObjIdx: i + 1 === parts.length ? dest.index : buildings.length + 1,
      outputToSlot: 1,
      outputFromSlot: 0,
      inputOffset: 0,
      outputOffset: 0,
      filterId: 0,
      recipeId: 0,
      parameters: null,
      tilt: 0,
      tilt2: 0,
      pitch: 0,
      pitch2: 0,
    })
  }
}

/** 把分馏阵列编入同一张蓝图。边缘入口用实带接上，已有物流站的用本地运输机。 */
export function integrateFractionators(
  str: string,
  feeds: FractionatorFeed[],
  spray: number,
  beltLevel: number,
  limits: Limits,
) {
  const bp = fromStr(str)
  const factory: Box = { x: 0, y: 0, w: bp.dragBoxSize.x, h: bp.dragBoxSize.y }
  const degree = SPRAY[spray].p
  const rayList = portRays(str)
  const rays = new Map(rayList.map((r) => [key(r.x, r.y), r.free]))
  const destinations = new Set<number>()
  const connected = new Set<string>()
  const stationUses = new Map<Building, number>()
  for (const feed of feeds) {
    if (feed.mode !== 'station') continue
    const { at, rate } = feed
    const b = bp.buildings.find((b) => b.itemId === STATION && sameCell(position(b), at))
    const slot = b?.parameters?.slots?.[feed.slot]
    const row = slot && b?.parameters?.storage?.[slot.storageIdx - 1]
    const outlet = bp.buildings.find(
      (v) => belt(v) && v.inputObjIdx === b?.index && v.inputFromSlot === feed.slot,
    )
    if (!b || !outlet || slot?.dir !== 1 || row?.itemId !== DEUTERIUM || row.localRole !== 2)
      throw new Error('找不到产线物流站的重氢进料带')
    if (rate > CAPACITY[beltLevel] * Math.max(1, b.parameters?.pilerCount ?? 1) + EPS)
      throw new Error(`物流站的重氢出站带 ${rate}/分 超过运力`)
    row.remoteRole = 0
    stationUses.set(b, (stationUses.get(b) ?? 0) + rate)
  }
  const jobs: { at: Point2; rate: number; mode: FractionatorFeed['mode']; places: number }[] = feeds
    .filter((f) => f.mode === 'edge')
    .map(({ at, rate, mode }) => ({ at, rate, mode, places: 1 }))
  for (const [b, rate] of stationUses) {
    const places = Math.ceil(rate / 1800)
    jobs.push({
      at: { x: Math.round(position(b).x), y: Math.round(position(b).y) },
      rate: rate / places,
      mode: 'station',
      places,
    })
  }
  const occupied = [factory]
  const routes = new Set<string>()
  const groundRoutes = new Set<string>()
  const placed: Placement[] = []
  for (const job of jobs.sort((a, b) => a.rate - b.rate)) {
    const { at, rate, mode } = job
    if (mode === 'edge' && rate > CAPACITY[beltLevel] + EPS)
      throw new Error(`重氢入口 ${rate}/分 超过所选传送带运力`)
    const array = integratedArray(rate, spray)
    const check = checkArray(array.str)
    const flow = flowCheck(array.str, degree)
    if (!check.ok || flow.errors.length || flow.total < rate - EPS)
      throw new Error(
        `分馏阵列校验失败：${[...check.errors, ...flow.errors].join('；') || `稳态产量 ${flow.total}/分，需求 ${rate}/分`}`,
      )
    const destination =
      mode === 'edge'
        ? bp.buildings.find(
            (b) =>
              belt(b) &&
              ground(position(b)) &&
              sameCell(position(b), at) &&
              b.parameters?.iconId === DEUTERIUM &&
              b.inputObjIdx === -1,
          )
        : undefined
    if (mode === 'edge' && (!destination || destinations.has(destination.index)))
      throw new Error(`找不到独立的重氢入口 (${at.x}, ${at.y})`)
    if (destination) destinations.add(destination.index)
    const source = station(array)
    if (mode === 'edge' && (source.b.yaw[0] !== 180 || source.slots[4]?.dir !== 0))
      throw new Error('分馏阵列缺少东向空闲站口')
    const store = source.storage.findIndex((s) => s.itemId === DEUTERIUM)
    if (store === -1) throw new Error('分馏阵列物流站缺少重氢存储格')
    source.storage[store].remoteRole = 0
    source.storage[store].localRole = mode === 'station' ? 1 : 0
    if (mode === 'edge') source.slots[4] = { dir: 1, storageIdx: store + 1 }
    for (let i = 0; i < job.places; i++) {
      const candidatesByArea = candidates(array, factory, occupied, at).sort((a, b) => {
        const A = bounds([...occupied, a]),
          B = bounds([...occupied, b])
        return A.w * A.h - B.w * B.h
      })
      let best: Placement | null = null
      for (const box of candidatesByArea) {
        const total = bounds([...occupied, box])
        if (
          !fits(total, { ...limits, maxAspect: null }) ||
          placed.some((p) => p.path.some(([x, y]) => contains(box, x, y)))
        )
          continue
        const search: Box = { x: total.x - 3, y: total.y - 3, w: total.w + 6, h: total.h + 6 }
        const avoid = new Set<string>()
        let accessible = true
        for (const r of rayList) {
          const k = key(r.x, r.y)
          if (connected.has(k) || (destination && k === key(at.x, at.y))) continue
          const free = r.free
            .map(([dx, dy]) => {
              const cells: Coord[] = []
              for (let x = r.x + dx, y = r.y + dy; contains(search, x, y); x += dx, y += dy)
                cells.push([x, y])
              return cells
            })
            .filter((cells) =>
              cells.every(
                ([x, y]) =>
                  occupied.slice(1).every((b) => !contains(b, x, y)) &&
                  !contains(box, x, y) &&
                  !groundRoutes.has(key(x, y)),
              ),
            )
          if (!free.length) {
            accessible = false
            break
          }
          free.sort((a, b) => a.length - b.length)
          for (const c of free[0]) avoid.add(key(...c))
        }
        if (!accessible) continue
        if (!destination) {
          best = { array, box, path: [], rate }
          break
        }
        const p = position(source.b)
        const sx = box.x + Math.round(p.x)
        const sy = box.y + Math.round(p.y)
        const start: Coord = [box.x + box.w, sy]
        const exit: Coord[] = Array.from({ length: start[0] - sx - 3 }, (_, i) => [sx + 3 + i, sy])
        if (
          array.buildings.some(
            (b) =>
              b !== source.b &&
              ground(position(b)) &&
              exit.some(([x, y]) => sameCell(position(b), { x: x - box.x, y: y - box.y })),
          )
        )
          continue
        for (const [dx, dy] of rays.get(key(at.x, at.y)) ?? []) {
          const to: Coord = [at.x + dx, at.y + dy]
          const leg: Coord[] = []
          while (contains(factory, ...to)) {
            leg.push([...to])
            to[0] += dx
            to[1] += dy
          }
          if (leg.some((p) => routes.has(key(...p)) || avoid.has(key(...p)))) continue
          const occupiedCell = (x: number, y: number) =>
            contains(box, x, y) || occupied.some((b) => contains(b, x, y)) || routes.has(key(x, y))
          const blocked = (x: number, y: number) => occupiedCell(x, y) || avoid.has(key(x, y))
          if (blocked(...start) || blocked(...to)) continue
          const groundPath = route(start, to, search, blocked)
          const overhead =
            !groundPath && !limits.noLift ? route(start, to, search, occupiedCell) : null
          if (!groundPath && !overhead) continue
          const onGround = ([x, y]: Coord): RouteCell => [x, y, 0]
          const between: RouteCell[] = groundPath
            ? groundPath.map(onGround)
            : [onGround(start), ...overhead!.map(([x, y]): RouteCell => [x, y, 1]), onGround(to)]
          const path = [...exit.map(onGround), ...between, ...leg.reverse().map(onGround)]
          const w = bounds([...occupied, box, ...path.map(([x, y]) => ({ x, y, w: 1, h: 1 }))])
          if (!fits(w, { ...limits, maxAspect: null })) continue
          if (!best || path.length < best.path.length) best = { array, box, path, destination, rate }
        }
        if (best) break
      }
      if (!best) throw new Error(`放不下重氢分馏阵列，或阵列接不到 ${rate}/分的重氢入口`)
      placed.push(best)
      if (destination) connected.add(key(at.x, at.y))
      occupied.push(best.box)
      for (const [x, y, z] of best.path) {
        routes.add(key(x, y))
        if (z === 0) groundRoutes.add(key(x, y))
      }
    }
  }
  const total = bounds([
    ...occupied,
    ...placed.flatMap((p) => p.path.map(([x, y]) => ({ x, y, w: 1, h: 1 }))),
  ])
  if (!fits(total, limits)) throw new Error(`含分馏阵列的蓝图 ${total.w}×${total.h} 超出尺寸上限`)
  const shift = { x: -total.x, y: -total.y }
  for (const b of bp.buildings)
    for (const p of b.localOffset) {
      p.x += shift.x
      p.y += shift.y
    }
  const modules = placed.map((p) => {
    const offset = append(bp, p.array.buildings, p.box.x + shift.x, p.box.y + shift.y)
    const source = bp.buildings[offset + station(p.array).b.index]
    const head = bp.buildings.length
    if (p.destination) {
      addOutlet(bp.buildings, source, p.path, p.destination, shift)
      p.destination.parameters = null
    }
    return {
      offset,
      source: source.index,
      head,
      end: bp.buildings.length,
      target: p.destination?.index,
      demand: p.rate,
    }
  })
  bp.dragBoxSize = { x: total.w, y: total.h }
  bp.cursorOffset = { x: Math.floor(total.w / 2), y: Math.floor(total.h / 2) }
  bp.areas = [{ ...bp.areas[0], size: { ...bp.dragBoxSize } }]
  const count = placed.reduce((n, p) => n + p.array.fracs, 0)
  const rate = feeds.reduce((n, f) => n + f.rate, 0)
  bp.header.desc += `；分馏塔 ${count} 座，供线内重氢 ${+rate.toFixed(2)}/分。`
  const blueprint = toStr(bp)
  const blocked = blockedPorts(blueprint)
  if (blocked.length)
    throw new Error(
      `分馏阵列或接驳带挡住了产线的出入口：${blocked.map((p) => `${p.itemId} #${p.index}`).join('、')}`,
    )
  const saved = fromStr(blueprint).buildings
  for (const { offset, source, head, end, target, demand } of modules) {
    const module = saved.slice(offset, end)
    if (target !== undefined) {
      const first = saved[head]
      const st = saved[source]
      const slot = st.parameters?.slots?.[first.inputFromSlot]
      if (
        first.inputObjIdx !== source ||
        slot?.dir !== 1 ||
        st.parameters?.storage?.[slot.storageIdx - 1]?.itemId !== DEUTERIUM
      )
        throw new Error('分馏阵列的重氢出站口校验失败')
      for (let i = head; i < end; i++) {
        const next = i + 1 === end ? target : i + 1
        const a = position(saved[i]),
          b = position(saved[next])
        const flat =
          Math.abs(Math.round(a.x) - Math.round(b.x)) + Math.abs(Math.round(a.y) - Math.round(b.y))
        const vertical = Math.abs(Math.round(a.z) - Math.round(b.z))
        if (saved[i].outputObjIdx !== next || flat + vertical !== 1)
          throw new Error('分馏阵列的重氢带没有连到工厂入口')
      }
      module.push(saved[target])
    }
    const indices = new Map(module.map((b, i) => [b.index, i]))
    const fragment = module.map((b, i) => ({
      ...b,
      index: i,
      inputObjIdx: indices.get(b.inputObjIdx) ?? -1,
      outputObjIdx: indices.get(b.outputObjIdx) ?? -1,
    }))
    if (collisions(fragment, narrowestEW(total.h)).length)
      throw new Error('接入分馏阵列后出现建筑碰撞')
    const flow = flowCheck(fragment, degree)
    if (flow.errors.length || flow.total < demand - EPS)
      throw new Error('蓝图中的分馏阵列达不到所接产线的重氢需求')
  }
  return { blueprint, bp, placed, shift, count, rate }
}
