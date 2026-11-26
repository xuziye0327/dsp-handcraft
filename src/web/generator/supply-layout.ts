import type { SupplyChain, Flow, SupplyGraph, Unit } from './supply-types'

export const GRAPH = {
  w: 156,
  h: 50,
  gap: 12,
  link: 40,
  pad: 14,
  bar: 10,
  lane: 4,
  sweeps: 4,
  relax: 4,
  swaps: 2,
}
const BY = 100000
export function extGraph(d: SupplyChain): SupplyGraph {
  const goals = d.goals.map((g) => g.id)
  const raws: Unit[] = d.raws.filter((r) => r.id != null).map((r) => ({ ...r, state: 'raw' }))
  const mid = [...d.goals, ...d.units].filter((u) => goals.includes(u.id) || u.state !== 'dropped')
  const inLine = new Set(mid.map((u) => u.id))
  const bys = new Map<number, Unit>()
  const added: Flow[] = []
  const into = (id: number) =>
    d.edges.filter((e) => e.to === id && e.state !== 'dropped' && e.state !== 'by')
  const via: Flow[] = []
  for (const b of d.byproducts) {
    if (!inLine.has(b.ofId)) continue
    const id = BY + b.id
    const prev = bys.get(id)
    if (prev) prev.rate += b.rate
    else bys.set(id, { ...b, id, state: 'by' })
    added.push({ from: b.ofId, to: id, rate: b.rate, state: 'by' })
    via.push(...into(b.ofId).map((e) => ({ ...e, to: id, via: true })))
  }
  for (const u of mid)
    if (u.co != null && u.state === 'line')
      via.push(...into(u.co).map((e) => ({ ...e, to: u.id, via: true })))
  const nodes = [...mid, ...raws, ...bys.values()]
  const has = new Set(nodes.map((u) => u.id))
  const seen = new Set<string>()
  const edges = [...d.edges, ...added, ...via].filter((e) => {
    const key = `${e.from}>${e.to}`
    if (
      e.state === 'dropped' ||
      e.from === e.to ||
      !has.has(e.from) ||
      !has.has(e.to) ||
      seen.has(key)
    )
      return false
    seen.add(key)
    return true
  })
  const rank = new Map<number, number>()
  for (const id of [...goals, ...edges.map((e) => e.from), ...nodes.map((u) => u.id)])
    if (!rank.has(id)) rank.set(id, rank.size)
  nodes.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)
  return { nodes, edges }
}
interface Position {
  x: number
  y: number
  level: number
  lane: number
}
export interface Layout {
  pos: Position[]
  width: number
  height: number
}

// Layer from consumers towards ingredients. Side products sit one tier beyond the nearest producer.
export function layoutGraph(graph: SupplyGraph, o = GRAPH): Layout {
  const { nodes, edges } = graph
  const n = nodes.length
  if (!n) return { pos: [], width: 2 * o.pad, height: 2 * o.pad }
  const at = new Map(nodes.map((u, k) => [u.id, k]))
  const ups = nodes.map((): number[] => []),
    downs = nodes.map((): number[] => [])
  for (const e of edges) {
    const a = at.get(e.from),
      b = at.get(e.to)
    if (a == null || b == null || a === b) continue
    ups[a]!.push(b)
    downs[b]!.push(a)
  }
  const by = nodes.map((u) => u.state === 'by')
  const level = nodes.map(() => -1),
    busy = nodes.map(() => false)
  const lv = (k: number): number => {
    if (level[k]! >= 0 || busy[k]) return level[k]!
    busy[k] = true
    let l = 0
    for (const p of ups[k]!) if (!by[p]) l = Math.max(l, lv(p) + 1)
    busy[k] = false
    return (level[k] = l)
  }
  nodes.forEach((_, k) => lv(k))
  nodes.forEach((_, k) => {
    if (by[k] && downs[k]!.length) level[k] = Math.min(...downs[k]!.map((c) => level[c]!)) - 1
  })
  const lift = -Math.min(0, ...level)
  if (lift) level.forEach((l, k) => (level[k] = l + lift))
  const layer = Array.from({ length: Math.max(...level) + 1 }, (): number[] => [])
  nodes.forEach((_, k) => layer[level[k]!]!.push(k))
  const top: number[] = []
  let y = o.pad
  for (const ks of layer) {
    top.push(y)
    y += o.h + Math.max(o.link, 2 * o.bar + o.lane * (ks.filter((k) => downs[k]!.length).length - 1))
  }
  const height = top.at(-1)! + o.h + o.pad
  const W = o.w + o.gap,
    x = nodes.map(() => 0)
  const avg = (ks: number[]) => ks.reduce((s, k) => s + x[k]!, 0) / ks.length
  // Weighted isotonic regression: project centers onto consecutive non-overlapping slots.
  const put = (ks: number[], t: Map<number, number>, wt: Map<number, number>) => {
    const blocks: { s: number; w: number; from: number; to: number }[] = []
    ks.forEach((k, i) => {
      let b = { s: wt.get(k)! * (t.get(k)! - i * W), w: wt.get(k)!, from: i, to: i }
      for (let a = blocks.at(-1); a && a.s / a.w >= b.s / b.w; a = blocks.at(-1)) {
        blocks.pop()
        b = { s: a.s + b.s, w: a.w + b.w, from: a.from, to: b.to }
      }
      blocks.push(b)
    })
    for (const b of blocks) for (let i = b.from; i <= b.to; i++) x[ks[i]!] = b.s / b.w + i * W
  }
  const pass = (
    l: number,
    near: (k: number) => number[],
    alone: (k: number, prev: number | null) => number,
    sort: boolean,
  ) => {
    let ks = layer[l]!
    const t = new Map<number, number>(),
      wt = new Map<number, number>()
    let prev: number | null = null
    for (const k of ks) {
      const ns = near(k)
      prev = ns.length ? avg(ns) : alone(k, prev)
      t.set(k, prev)
      wt.set(k, Math.max(1, ns.length))
    }
    if (sort) ks = layer[l] = [...ks].sort((a, b) => t.get(a)! - t.get(b)!)
    put(ks, t, wt)
  }
  const stay = (k: number) => x[k]!
  const down = (sort: boolean) =>
    layer.forEach((_, l) =>
      pass(
        l,
        (k) => ups[k]!.filter((p) => level[p]! < l),
        (_, prev) => (prev == null ? 0 : prev + W),
        sort,
      ),
    )
  const up = (sort: boolean) =>
    layer
      .map((_, l) => l)
      .reverse()
      .forEach((l) => pass(l, (k) => downs[k]!.filter((c) => level[c]! > l), stay, sort))
  const place = () => {
    down(false)
    for (let r = 0; r < o.relax; r++) {
      const ls = layer.map((_, l) => l)
      for (const l of r % 2 ? ls.reverse() : ls)
        pass(l, (k) => [...ups[k]!, ...downs[k]!], stay, false)
    }
  }
  const finish = (): Layout => {
    const X = nodes.map(() => 0)
    for (const ks of layer)
      ks.forEach(
        (k, i) => (X[k] = i ? Math.max(Math.round(x[k]!), X[ks[i - 1]!]! + W) : Math.round(x[k]!)),
      )
    const dx = o.pad + o.w / 2 - Math.min(...X)
    const pos = nodes.map((_, k) => ({
      x: X[k]! + dx,
      y: top[level[k]!]!,
      level: level[k]!,
      lane: -1,
    }))
    for (const ks of layer) ks.filter((k) => downs[k]!.length).forEach((k, i) => (pos[k]!.lane = i))
    return { pos, width: Math.max(...X) + dx + o.w / 2 + o.pad, height }
  }
  const cost = () => {
    const c = graphCrossings(graph, finish(), o)
    return c.crossings + c.passes
  }
  place()
  let best = { cost: cost(), order: layer.map((ks) => [...ks]) }
  for (let i = 0; i < o.sweeps; i++)
    for (const sweep of [down, up]) {
      sweep(true)
      place()
      const c = cost()
      if (c < best.cost) best = { cost: c, order: layer.map((ks) => [...ks]) }
    }
  best.order.forEach((ks, l) => (layer[l] = ks))
  for (let r = 0, better = true; better && r < o.swaps; r++) {
    better = false
    for (const ks of layer)
      for (let i = 1; i < ks.length; i++) {
        const a = ks[i - 1]!,
          b = ks[i]!
        ks[i - 1] = b
        ks[i] = a
        place()
        const c = cost()
        if (c < best.cost) {
          best.cost = c
          better = true
        } else {
          ks[i - 1] = a
          ks[i] = b
        }
      }
  }
  place()
  return finish()
}

interface Drop {
  from: number
  x: number
  top: number
}
export function graphRoutes({ nodes, edges }: SupplyGraph, L: Layout, o = GRAPH) {
  const at = new Map(nodes.map((u, k) => [u.id, k]))
  const users = new Map<number, number[]>(),
    groups = new Map<number, Drop[]>(),
    ings = new Map<number, number[]>()
  for (const e of edges) {
    const a = at.get(e.from),
      b = at.get(e.to)
    if (a == null || b == null || a === b) continue
    if (!users.has(a)) users.set(a, [])
    if (!ings.has(b)) ings.set(b, [])
    users.get(a)!.push(b)
    ings.get(b)!.push(a)
    groups.set(b, [])
  }
  const inner = (k: number): [number, number] => [
    L.pos[k]!.x - o.w / 2 + 8,
    L.pos[k]!.x + o.w / 2 - 8,
  ]
  const want = (p: number, a: number) => {
    const l = ings.get(p)!.length === 1 ? Math.max(inner(p)[0], inner(a)[0]) : L.pos[p]!.x
    const r = ings.get(p)!.length === 1 ? Math.min(inner(p)[1], inner(a)[1]) : L.pos[p]!.x
    return l <= r ? Math.min(Math.max(L.pos[p]!.x, l), r) : null
  }
  const stem = new Map<number, number>()
  const bar = (p: number) => L.pos[p]!.y + o.h + o.bar + o.lane * Math.max(0, L.pos[p]!.lane)
  const cheapest = <T extends { cost: number }>(xs: T[]) =>
    xs.reduce((m, t) => (t.cost < m.cost ? t : m))
  for (const [a, ps] of users) {
    const P = L.pos[a]!,
      [lo, hi] = inner(a),
      gap = Math.min(8, Math.floor(o.w / (ps.length + 1)))
    ps.sort((p, q) => L.pos[p]!.x - L.pos[q]!.x || L.pos[p]!.level - L.pos[q]!.level)
    // Candidate ports include a straight drop, evenly spaced port and obstacle boundaries.
    const cands = ps.map((p, i) => {
      const even = Math.round(P.x - o.w / 2 + (o.w * (i + 1)) / (ps.length + 1))
      const walls = L.pos
        .filter((K, k) => k !== p && k !== a && K.y + o.h > bar(p) && K.y < P.y)
        .map((K): [number, number] => [K.x - o.w / 2 - 4, K.x + o.w / 2 + 4])
      const w = want(p, a),
        under = w != null && w >= lo && w <= hi ? [w] : []
      return [...under, even, lo, hi, ...walls.flat().filter((x) => x > lo && x < hi)].map(
        (x, k) => ({
          x,
          cost:
            (k < under.length ? -o.w : Math.abs(x - even)) +
            (walls.some(([l, r]) => l < x && x < r) ? 1000 : 0),
        }),
      )
    })
    let paths: { x: number; cost: number; xs: number[] }[] = [{ x: -Infinity, cost: 0, xs: [] }]
    for (const cs of cands)
      paths = cs.flatMap((c) => {
        const ok = paths.filter((t) => c.x >= t.x + gap)
        if (!ok.length) return []
        const t = cheapest(ok)
        return [{ x: c.x, cost: t.cost + c.cost, xs: [...t.xs, c.x] }]
      })
    const pick = cheapest(paths).xs
    ps.forEach((p, i) => {
      groups.get(p)!.push({ from: a, x: pick[i]!, top: P.y })
      if (ings.get(p)!.length === 1 && pick[i] === want(p, a)) stem.set(p, pick[i]!)
    })
  }
  return [...groups].map(([b, drops]) => ({
    to: b,
    px: stem.get(b) ?? L.pos[b]!.x,
    bottom: L.pos[b]!.y + o.h,
    bar: bar(b),
    drops,
  }))
}
interface PathSegments {
  p: number
  c: number
  y: number
  x1: number
  x2: number
  px: number
  y0: number
  dx: number
  d0: number
  d1: number
}
export function graphCrossings(G: SupplyGraph, L: Layout, o = GRAPH) {
  const ls: PathSegments[] = []
  for (const r of graphRoutes(G, L, o))
    for (const q of r.drops)
      ls.push({
        p: r.to,
        c: q.from,
        y: r.bar,
        x1: Math.min(r.px, q.x),
        x2: Math.max(r.px, q.x),
        px: r.px,
        y0: r.bottom,
        dx: q.x,
        d0: Math.min(r.bar, q.top),
        d1: Math.max(r.bar, q.top),
      })
  const cross = (a: PathSegments, b: PathSegments) =>
    (a.x1 < b.px && b.px < a.x2 && b.y0 < a.y && a.y < b.y) ||
    (a.x1 < b.dx && b.dx < a.x2 && b.d0 < a.y && a.y < b.d1)
  const stack = (x: number, lo: number, hi: number, b: PathSegments) =>
    (x === b.px && Math.max(lo, b.y0) < Math.min(hi, b.y)) ||
    (x === b.dx && Math.max(lo, b.d0) < Math.min(hi, b.d1))
  let crossings = 0,
    passes = 0
  for (let i = 0; i < ls.length; i++)
    for (let j = i + 1; j < ls.length; j++) {
      const a = ls[i]!,
        b = ls[j]!
      if (
        a.p !== b.p &&
        (cross(a, b) || cross(b, a) || stack(a.px, a.y0, a.y, b) || stack(a.dx, a.d0, a.d1, b))
      )
        crossings++
    }
  for (const a of ls)
    L.pos.forEach((P, k) => {
      if (k !== a.p && k !== a.c && Math.abs(a.dx - P.x) < o.w / 2 && a.d0 < P.y + o.h && P.y < a.d1)
        passes++
    })
  return { crossings, passes }
}
