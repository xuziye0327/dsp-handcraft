// 量产计算照 DSQ（github.com/122474363/DSQ，GPL-3.0）；原始配方来自同目录的 dsq-data.js。
import { ICON_AT } from './atlas'

export type Machine = [name: string, speed: number]
export const MACHINES: Record<string, [Machine, ...Machine[]]> = {
  冶炼设备: [
    ['电弧熔炉', 1],
    ['位面熔炉', 2],
    ['负熵熔炉', 3],
  ],
  原油精炼机: [['原油精炼机', 1]],
  化工设备: [
    ['化工厂', 1],
    ['量子化工厂', 2],
  ],
  分馏塔: [['分馏塔', 30]],
  粒子对撞机: [['粒子对撞机', 1]],
  制作台: [
    ['制作台Mk.Ⅰ', 0.75],
    ['制作台Mk.Ⅱ', 1],
    ['制作台Mk.Ⅲ', 1.5],
    ['重组式制造台', 3],
  ],
  研究站: [
    ['矩阵研究站', 1],
    ['自演化研究站', 3],
  ],
  射线接收塔: [['射线接收塔', 1]],
  能量枢纽: [['能量枢纽', 1]],
}
export const KIND_ORDER = Object.keys(MACHINES)
export const PICKABLE = ['冶炼设备', '制作台', '化工设备', '研究站']
export const KIND_LABEL: Record<string, string> = {
  冶炼设备: '熔炉',
  原油精炼机: '原油精炼厂',
  化工设备: '化工厂',
  分馏塔: '分馏塔',
  粒子对撞机: '粒子对撞机',
  制作台: '制造台',
  研究站: '研究站',
  射线接收塔: '射线接收站',
  能量枢纽: '能量枢纽',
}
export const POWER: Record<string, number> = {
  电弧熔炉: 0.36,
  位面熔炉: 1.44,
  负熵熔炉: 2.88,
  原油精炼机: 0.96,
  化工厂: 0.72,
  量子化工厂: 2.16,
  分馏塔: 0.72,
  粒子对撞机: 12,
  '制作台Mk.Ⅰ': 0.27,
  '制作台Mk.Ⅱ': 0.54,
  '制作台Mk.Ⅲ': 1.08,
  重组式制造台: 2.7,
  矩阵研究站: 0.48,
  自演化研究站: 1.92,
  射线接收塔: 0,
  能量枢纽: 0,
}
export const SHOWN: Record<string, string> = {
  '制作台Mk.Ⅰ': '制造台 Mk.Ⅰ',
  '制作台Mk.Ⅱ': '制造台 Mk.Ⅱ',
  '制作台Mk.Ⅲ': '制造台 Mk.Ⅲ',
  原油精炼机: '原油精炼厂',
  粒子对撞机: '微型粒子对撞机',
  射线接收塔: '射线接收站',
}
export const ICON_NAME: Record<string, string> = {
  原油精炼机: '原油精炼厂',
  粒子对撞机: '微型粒子对撞机',
  射线接收塔: '射线接收站',
  火力发电厂: '火力发电机',
}
export const SOURCE: Record<string, string> = {
  采矿机: '采矿',
  原油萃取站: '原油萃取站',
  抽水机: '抽水站',
  轨道采集器: '轨道采集器',
  轨道采集器2: '轨道采集器',
  射线接收塔: '射线接收站',
  黑雾掉落: '黑雾掉落',
}
export interface Spray {
  name: string
  short: string
  extra: number
  speed: number
  sprays: number
  power: number
}
export const SPRAY: [null, Spray, Spray, Spray] = [
  null,
  { name: '增产剂Mk.Ⅰ', short: 'Mk.Ⅰ', extra: 0.125, speed: 0.25, sprays: 12, power: 1.3 },
  { name: '增产剂Mk.Ⅱ', short: 'Mk.Ⅱ', extra: 0.2, speed: 0.5, sprays: 24, power: 1.7 },
  { name: '增产剂Mk.Ⅲ', short: 'Mk.Ⅲ', extra: 0.25, speed: 1, sprays: 60, power: 2.5 },
]
export const BELTS: [string, number, string][] = [
  ['传送带', 360, '传送带'],
  ['高速传送带', 720, '高速带'],
  ['极速传送带', 1800, '极速带'],
]
export const RARE = [
  '可燃冰',
  '金伯利矿石',
  '分形硅石',
  '有机晶体',
  '光栅石',
  '刺笋结晶',
  '单极磁石',
]
export const QUICK = ['蓝矩阵', '红矩阵', '黄矩阵', '紫矩阵', '绿矩阵', '宇宙矩阵']
export const EPS = 1e-9

interface DsqAmount {
  name: string
  n?: number | string
}
interface DsqRecipe {
  m: string
  t?: number | string
  noExtra?: boolean | null
  gameId?: number
  s?: DsqAmount[]
  q?: DsqAmount[]
}
declare const data: DsqRecipe[]
declare const GAME_ITEM_IDS: Record<string, number>
export interface Amount {
  name: string
  n: number
}
export interface Recipe {
  s: Amount[]
  q: Amount[]
  out: Amount[]
  in: Amount[]
  kind: string
  t: number
  noExtra: boolean | null | undefined
  gameId: number
  source: boolean
  key: string
}
export let RECIPES: Recipe[] = []
export const PRODUCERS = new Map<string, Recipe[]>()
export const BY_KEY = new Map<string, Recipe>()
export const RARE_ALT = new Map<string, [rare: string, recipe: Recipe][]>()
export let GAME_IDS: Record<string, number> = {}
function append<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}
export function prepare(d: DsqRecipe): Recipe {
  const amounts = (xs: DsqAmount[] = []) => xs.map((x) => ({ name: x.name, n: Number(x.n) || 1 }))
  const s = amounts(d.s),
    q = amounts(d.q)
  const out = s.map((x) => ({ ...x })),
    inp = q.map((x) => ({ ...x }))
  for (const o of out)
    for (const i of inp) {
      if (o.name !== i.name) continue
      const c = Math.min(o.n, i.n)
      o.n -= c
      i.n -= c
    }
  return {
    s,
    q,
    out: out.filter((o) => o.n > EPS),
    in: inp.filter((i) => i.n > EPS),
    kind: d.m,
    t: Number(d.t) || 1,
    noExtra: d.noExtra,
    gameId: d.gameId || 0,
    source: !q.length,
    key: d.gameId
      ? `g${d.gameId}`
      : `${d.m}:${q.map((x) => x.name).join('+')}>${s.map((x) => x.name).join('+')}`,
  }
}
export function loadData() {
  if (typeof data === 'undefined' || !Array.isArray(data)) throw new Error('dsq-data.js 没载入')
  RECIPES = data.map(prepare)
  GAME_IDS = typeof GAME_ITEM_IDS === 'undefined' ? {} : GAME_ITEM_IDS
  PRODUCERS.clear()
  BY_KEY.clear()
  RARE_ALT.clear()
  for (const r of RECIPES) {
    BY_KEY.set(r.key, r)
    for (const o of r.out) append(PRODUCERS, o.name, r)
  }
  for (const [name, list] of PRODUCERS)
    for (const r of list) {
      const rare = r.q.find((x) => RARE.includes(x.name))
      if (rare && r.s.reduce((a, b) => (b.n > a.n ? b : a)).name === name)
        append(RARE_ALT, name, [rare.name, r])
    }
}

export type SprayMode = 'extra' | 'speed'
export type CalcMode = 'supply' | 'demand'
export interface Goal {
  name: string
  rate: number
}
export interface Part extends Goal {
  machine: string | null
  count: number
  recipe: string | null
  mode: SprayMode | null
  group: number
}
export interface Built {
  out: Record<string, number>
  takes: Record<string, number>
  parts: Part[]
}
export interface State {
  goals: Goal[]
  recipe: Record<string, string>
  built: Built[]
  kind: Record<string, string>
  machineOf: Record<string, string>
  spray: { level: number; mode: SprayMode }
  sprayOf: Record<string, SprayMode | 'none'>
  belt: number
  rare: Record<string, boolean>
  pick: string[]
}
export interface Tab {
  id: string
  name: string
  state: State
}
export const BASE: State = {
  goals: [{ name: '蓝矩阵', rate: 60 }],
  recipe: {},
  built: [],
  kind: { 冶炼设备: '电弧熔炉', 制作台: '制作台Mk.Ⅰ', 化工设备: '化工厂', 研究站: '矩阵研究站' },
  machineOf: {},
  spray: { level: 0, mode: 'extra' },
  sprayOf: {},
  belt: 2,
  rare: Object.fromEntries(RARE.map((n) => [n, true])),
  pick: [],
}
export const STORE = 'dsq-calc-tabs',
  OLD_STORE = 'dsq-calc-next',
  MODE_KEY = 'dsq-calc-mode'
export let tabs: Tab[] = []
export let active = 0
export let state: State
export let mode: CalcMode = 'supply'
export const builtNow = (): Built[] => (mode === 'supply' ? state.built : [])
export function setState(next: State) {
  state = next
}
export function setActive(index: number) {
  const tab = tabs[index]
  if (!tab) throw new RangeError(`Unknown calculator tab: ${index}`)
  active = index
  state = tab.state
}
export function setCalcMode(next: CalcMode) {
  mode = next
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    /* Storage disabled. */
  }
}
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown): v is string => typeof v === 'string'
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
const sprayMode = (v: unknown): v is SprayMode => v === 'extra' || v === 'speed'
function dict<T>(o: unknown, valid: (v: unknown) => v is T): Record<string, T> {
  return Object.fromEntries(Object.entries(obj(o)).filter((e): e is [string, T] => valid(e[1])))
}
export function cleanBuilt(value: unknown, known: boolean | null = null): Built {
  const b = obj(value)
  const name = (v: unknown): v is string => str(v) && (!known || PRODUCERS.has(v))
  const rates = (o: unknown) =>
    Object.fromEntries(Object.entries(dict(o, positive)).filter(([n]) => name(n)))
  const parts: Part[] = []
  for (const input of array(b.parts)) {
    const p = obj(input)
    if (!name(p.name) || !positive(p.rate)) continue
    parts.push({
      name: p.name,
      rate: p.rate,
      machine: str(p.machine) ? p.machine : null,
      count: positive(p.count) ? Math.round(p.count) : 0,
      recipe: str(p.recipe) && (!known || BY_KEY.has(p.recipe)) ? p.recipe : null,
      mode: sprayMode(p.mode) ? p.mode : null,
      group: typeof p.group === 'number' && Number.isInteger(p.group) ? p.group : 0,
    })
  }
  return { out: rates(b.out), takes: rates(b.takes), parts }
}
export function filled(input: unknown): State {
  const s = obj(input),
    spray = obj(s.spray),
    base = structuredClone(BASE)
  const goals = Array.isArray(s.goals)
    ? array(s.goals)
        .map(obj)
        .flatMap((g) =>
          str(g.name) && typeof g.rate === 'number' ? [{ name: g.name, rate: g.rate }] : [],
        )
    : base.goals
  return {
    goals,
    recipe: dict(s.recipe, str),
    built: array(s.built)
      .map((b) => cleanBuilt(b))
      .filter((b) => Object.keys(b.out).length),
    kind: { ...base.kind, ...dict(s.kind, str) },
    machineOf: dict(s.machineOf, str),
    spray: {
      level:
        typeof spray.level === 'number' &&
        Number.isInteger(spray.level) &&
        spray.level >= 0 &&
        spray.level < SPRAY.length
          ? spray.level
          : base.spray.level,
      mode: sprayMode(spray.mode) ? spray.mode : base.spray.mode,
    },
    sprayOf: dict(s.sprayOf, (v): v is SprayMode | 'none' => sprayMode(v) || v === 'none'),
    belt: typeof s.belt === 'number' && BELTS[s.belt] ? s.belt : base.belt,
    rare: dict(s.rare, (v): v is boolean => typeof v === 'boolean'),
    pick: array(s.pick).filter(str),
  }
}
export function restore() {
  tabs = []
  try {
    const snapshot: unknown = JSON.parse(localStorage.getItem(STORE) ?? 'null')
    const saved = obj(snapshot)
    if (Array.isArray(saved.tabs)) {
      for (const input of array(saved.tabs)) {
        const t = obj(input)
        if (Array.isArray(obj(t.state).goals))
          tabs.push({
            id:
              typeof t.id === 'string' || typeof t.id === 'number'
                ? String(t.id)
                : `page-${tabs.length}`,
            name: (str(t.name) && t.name ? t.name : '总页面').replace(/^档 (\d+)$/, '页面 $1'),
            state: filled(t.state),
          })
      }
    } else if (!snapshot) {
      const old = obj(JSON.parse(localStorage.getItem(OLD_STORE) ?? 'null'))
      if (Array.isArray(old.goals)) tabs.push({ id: 'default', name: '总页面', state: filled(old) })
    }
    if (tabs[0]?.name === '默认') tabs[0].name = '总页面'
  } catch {
    /* Default tab remains usable without storage. */
  }
  if (!tabs.length) tabs.push({ id: 'default', name: '总页面', state: structuredClone(BASE) })
  setActive(0)
}
export function save() {
  tabs[active]!.state = state
  try {
    localStorage.setItem(STORE, JSON.stringify({ tabs }))
  } catch {
    /* In-memory changes still apply. */
  }
}
try {
  if (localStorage.getItem(MODE_KEY) === 'demand') mode = 'demand'
} catch {
  /* Supply by default. */
}
restore()

export function autoPick() {
  const first = state.goals.find((g) => PRODUCERS.has(g.name))
  if (first && !state.pick.length) state.pick = [first.name]
}

export function sourceOf(name: string): Recipe | null {
  const pick = state.recipe[name]
  if (pick === 'raw' || pick === 'ext') return null
  const list = PRODUCERS.get(name) ?? []
  const chosen = list.find((r) => r.key === pick && !r.source)
  if (chosen) return chosen
  const has = state.rare
  if (has[name] === true && list.some((r) => r.source)) return null
  const alt = RARE_ALT.get(name)?.find(([rare]) => has[rare] === true)
  if (alt) return alt[1]
  const r = list[0]
  if (!r || r.source) return null
  if (r.q.some((q) => has[q.name] === false))
    return list.find((x) => !x.source && !x.q.some((q) => has[q.name] === false)) ?? r
  return r
}
export const isRawByNature = (name: string) => PRODUCERS.get(name)?.some((r) => r.source) ?? false
export function machineOf(r: Recipe): Machine | null {
  const list = MACHINES[r.kind]
  if (!list) return null
  const want = state.machineOf[r.key] || state.kind[r.kind]
  return list.find((m) => m[0] === want) ?? list[0]
}
export function sprayOf(r: Recipe): SprayMode | null {
  if (!state.spray.level || r.noExtra === null || !r.q.length) return null
  const m = state.sprayOf[r.key] || state.spray.mode
  return m === 'none' ? null : m === 'extra' && r.noExtra ? 'speed' : m
}

type Rates = Map<string, number>
interface Ledger {
  done: Rates
  takes: Rates
}
function add(map: Rates, name: string, value: number) {
  map.set(name, (map.get(name) ?? 0) + value)
}
export function ledgerOf(built: Built[]): Ledger {
  const done: Rates = new Map(),
    takes: Rates = new Map()
  for (const b of built) {
    for (const [n, v] of Object.entries(b.out)) add(done, n, v)
    for (const [n, v] of Object.entries(b.takes)) add(takes, n, v)
  }
  return { done, takes }
}
export interface Run {
  r: Recipe
  by: string[]
  mode: SprayMode | null
  v: number
  a: number
  x: number
  machine: Machine | null
  sprayUse: number
  count: number
  leader: string
}
export interface BuiltRecord {
  i: number
  rate: number
  parent: boolean
  part: Part | null
  from: string[]
  sameAs: string | null
}
interface RowBase {
  name: string
  need: number
  other: number
  goal: boolean
  part?: number
  ext?: boolean
  orphan?: boolean
  recs?: BuiltRecord[]
  first?: boolean
}
export type ProductionRow = RowBase & { r: Recipe; u: Run }
export type Row = ProductionRow | (RowBase & { r: null; u: null })
export interface Raw {
  name: string
  need: number
  other: number
  bring: number
  ext: boolean
}
export interface Surplus {
  name: string
  amount: number
  from: string[]
}
export interface Result extends Ledger {
  goals: Goal[]
  sp: Spray | null
  rows: Row[]
  raw: Raw[]
  surplus: Surplus[]
  fleet: Rates
  powerBy: Rates
  sprayBy: Rates
  power: number
  sprayUse: number
  usedBy: Map<string, string[]>
  runs: Map<Recipe, Run>
  bad: boolean
  src: Map<string, Recipe | null>
  full: Set<string>
  cut: Set<string>
  rem?: Result
}
export function solve(): Result {
  const led = ledgerOf(builtNow())
  let full = new Set<string>()
  let rem: Result
  for (;;) {
    rem = solveWith(led, full)
    if (rem.full.size === full.size) break
    full = rem.full
  }
  if (!builtNow().length) return rem
  const res = solveWith({ done: new Map(), takes: new Map() }, new Set(), true)
  res.rem = rem
  return res
}

/** A built item's dependencies may no longer appear in the active recipe graph. Keep
 * those rows below their original parents. Limit relaxation on cyclic recipe graphs. */
function depths(goals: Goal[], src: Map<string, Recipe | null>, sp: Spray | null) {
  const depth = new Map(goals.map((g) => [g.name, 0]))
  const relax = () => {
    let moved = true
    for (let pass = 0; moved && pass < 40; pass++) {
      moved = false
      const advance = (n: string, d: number) => {
        if ((depth.get(n) ?? -Infinity) >= d) return
        depth.set(n, d)
        moved = true
      }
      for (const [name, r] of src) {
        const d = depth.get(name)
        if (r && d !== undefined) for (const q of r.in) advance(q.name, d + 1)
      }
      for (const b of builtNow()) {
        const d = Math.min(...Object.keys(b.out).map((n) => depth.get(n) ?? Infinity)) + 1
        if (d === Infinity) continue
        for (const n of Object.keys(b.takes)) advance(n, d)
        const part = new Map(b.parts.map((p) => [p.name, p]))
        const seen = new Set<string>()
        for (const queue = Object.keys(b.out).filter((n) => depth.has(n)); queue.length;) {
          const n = queue.shift()!
          if (seen.has(n)) continue
          seen.add(n)
          const key = part.get(n)?.recipe
          for (const q of (key && BY_KEY.get(key)?.in) || []) {
            if (!part.has(q.name)) continue
            if (!depth.has(q.name)) advance(q.name, depth.get(n)! + 1)
            queue.push(q.name)
          }
        }
      }
    }
  }
  relax()
  if (sp && src.has(sp.name) && !depth.has(sp.name)) {
    depth.set(sp.name, Math.max(0, ...depth.values()) + 1)
    relax()
  }
  return (name: string) => depth.get(name) ?? 1e6
}
function attachBuiltRows(rows: Row[], need: Rates) {
  const recsOf = new Map<string, BuiltRecord[]>()
  builtNow().forEach((b, i) => {
    const lead = new Map<number, string>()
    for (const p of b.parts) if (!lead.has(p.group)) lead.set(p.group, p.name)
    const rec = (name: string, rate: number, parent: boolean, p?: Part) => {
      const first = p && lead.get(p.group)
      append(recsOf, name, {
        i,
        rate,
        parent,
        part: p ?? null,
        from: Object.keys(b.out),
        sameAs: first && first !== name ? first : null,
      })
    }
    for (const [name, rate] of Object.entries(b.out))
      rec(
        name,
        rate,
        true,
        b.parts.find((p) => p.name === name),
      )
    for (const p of b.parts) if (!(p.name in b.out)) rec(p.name, p.rate, false, p)
  })
  for (const [name, recs] of recsOf) {
    const row = rows.find((x) => x.name === name)
    if (row) row.recs = recs
    else
      rows.push({
        name,
        r: null,
        u: null,
        need: need.get(name) ?? 0,
        other: 0,
        goal: false,
        ext: true,
        orphan: true,
        recs,
      })
  }
}
export function solveWith({ done, takes }: Ledger, full: Set<string>, show = false): Result {
  const goals = state.goals.filter((g) => g.name && g.rate > 0)
  const sp = SPRAY[state.spray.level] ?? null
  const src = new Map<string, Recipe | null>(),
    runs = new Map<Recipe, Run>()
  const todo = [...goals.map((g) => g.name), ...takes.keys()].reverse()
  while (todo.length) {
    const name = todo.pop()!
    if (src.has(name)) continue
    const r = full.has(name) ? null : sourceOf(name)
    src.set(name, r)
    if (!r) continue
    let u = runs.get(r)
    if (!u) {
      const mode = sp ? sprayOf(r) : null
      u = {
        r,
        by: [],
        mode,
        v: sp && mode === 'extra' ? 1 + sp.extra : 1,
        a: sp && mode === 'speed' ? 1 + sp.speed : 1,
        x: 0,
        sprayUse: 0,
        count: 0,
        machine: machineOf(r),
        leader: '',
      }
      runs.set(r, u)
      for (let i = r.in.length - 1; i >= 0; i--) todo.push(r.in[i]!.name)
      if (sp && mode) todo.unshift(sp.name)
    }
    u.by.push(name)
  }
  const depthOf = depths(goals, src, sp)
  const order = [...runs.values()].sort(
    (a, b) => Math.min(...a.by.map(depthOf)) - Math.min(...b.by.map(depthOf)),
  )
  const charges = sp ? sp.sprays * (1 + sp.extra) - 1 : 1
  const flows = () => {
    const need: Rates = new Map(),
      made: Rates = new Map()
    let sprayUse = 0
    for (const g of goals) add(need, g.name, g.rate)
    for (const [n, v] of takes) if (src.has(n)) add(need, n, v)
    for (const [n, v] of done) if (src.get(n)) add(made, n, v)
    for (const u of runs.values()) {
      // 射线接收塔只加速光子；透镜仍然每十分钟消耗一个。
      const k = u.r.kind === '射线接收塔' ? 1 / u.a : 1
      let fed = 0
      for (const q of u.r.in) {
        const rate = q.n * u.x * k
        add(need, q.name, rate)
        fed += rate
      }
      u.sprayUse = u.mode ? fed / charges : 0
      sprayUse += u.sprayUse
      for (const o of u.r.out) add(made, o.name, o.n * u.v * u.x)
    }
    if (sp && sprayUse) add(need, sp.name, sprayUse)
    return { need, made, sprayUse }
  }
  let bad = false
  for (let it = 0; ; it++) {
    const { need, made } = flows()
    let moved = 0
    for (const u of order) {
      let x = 0
      for (const name of u.by) {
        const output = u.r.out.find((y) => y.name === name)!.n * u.v
        const others = (made.get(name) ?? 0) - output * u.x
        x = Math.max(x, ((need.get(name) ?? 0) - others) / output)
      }
      moved = Math.max(moved, Math.abs(x - u.x) / (1 + Math.abs(x)))
      u.x = x
    }
    if (moved < 1e-12) break
    if (it > 400 || order.some((u) => !(u.x < 1e12))) {
      bad = true
      break
    }
  }
  const { need, made, sprayUse } = flows()
  for (const u of runs.values()) u.count = u.machine ? (u.x * u.r.t) / 60 / (u.machine[1] * u.a) : 0
  const rows: Row[] = []
  const raw: Raw[] = []
  for (const [name, r] of src) {
    const n = need.get(name) ?? 0,
      m = made.get(name) ?? 0
    const goal = goals.some((g) => g.name === name)
    if (!r) {
      const pick = state.recipe[name]
      if ((pick === 'ext' || pick === 'raw') && PRODUCERS.get(name)?.some((x) => !x.source))
        rows.push({ name, r: null, u: null, need: n, other: Math.min(n, m), goal, ext: true })
      raw.push({
        name,
        need: n,
        other: Math.min(n, m),
        bring: Math.max(0, n - m),
        ext: pick === 'ext' || !isRawByNature(name),
      })
      continue
    }
    const u = runs.get(r)!
    const own = r.out.find((y) => y.name === name)!.n * u.v * u.x
    const part = done.get(name) ?? 0
    rows.push({ name, r, u, need: n, other: Math.max(0, m - own - part), part, goal })
  }
  const covered = rows
    .filter(
      (row) =>
        row.part !== undefined &&
        row.part > 0 &&
        row.need - row.part - row.other <= 1e-3 + 1e-6 * row.need,
    )
    .map((row) => row.name)
  const cut = new Set(
    rows
      .filter(
        (row) => (row.part ?? 0) - (takes.get(row.name) ?? 0) > 1e-3 && !covered.includes(row.name),
      )
      .map((row) => row.name),
  )
  if (show) attachBuiltRows(rows, need)
  const grid = (name: string) => ICON_AT.get(name) ?? 1e6
  rows.sort((a, b) => depthOf(a.name) - depthOf(b.name) || grid(a.name) - grid(b.name))
  for (const row of rows)
    if (row.u) {
      row.first = !row.u.leader
      row.u.leader ||= row.name
    }
  const usedBy = new Map<string, string[]>()
  for (const u of runs.values()) for (const q of u.r.in) append(usedBy, q.name, u.leader)
  if (sp && sprayUse) append(usedBy, sp.name, '喷涂')
  raw.sort((a, b) => b.bring - a.bring)
  const surplus: Surplus[] = []
  for (const [name, m] of made) {
    const n = need.get(name) ?? 0
    if (m - n <= 1e-6 * Math.max(1, m)) continue
    const from = [...runs.values()]
      .filter((u) => u.x > EPS && u.r.out.some((o) => o.name === name))
      .flatMap((u) => u.by.filter((b) => b !== name))
    surplus.push({ name, amount: m - n, from: [...new Set(from)] })
  }
  const fleet: Rates = new Map(),
    powerBy: Rates = new Map(),
    sprayBy: Rates = new Map()
  let power = 0
  const units = [...runs.values()].filter(
    (u): u is Run & { machine: Machine } => !!u.machine && u.count > 1e-6,
  )
  const modelIndex = (u: Run) => MACHINES[u.r.kind]!.findIndex((m) => m === u.machine)
  units.sort(
    (a, b) =>
      KIND_ORDER.indexOf(a.r.kind) - KIND_ORDER.indexOf(b.r.kind) || modelIndex(a) - modelIndex(b),
  )
  for (const u of units) {
    const n = Math.ceil(u.count - 1e-6),
      model = u.machine[0]
    const w = n * (POWER[model] ?? 0) * (u.mode && sp ? sp.power : 1)
    add(fleet, model, n)
    add(powerBy, model, w)
    if (u.sprayUse > EPS) add(sprayBy, model, u.sprayUse)
    power += w
  }
  return {
    goals,
    sp,
    rows,
    raw,
    surplus,
    fleet,
    powerBy,
    sprayBy,
    power,
    sprayUse,
    usedBy,
    runs,
    bad,
    src,
    done,
    takes,
    full: new Set([...full, ...covered]),
    cut,
  }
}

export function pickOf(res: Result | null | undefined) {
  const rows = res?.rows.filter((row): row is ProductionRow => !!row.u) ?? []
  const runOf = new Map(rows.map((row) => [row.name, row.u]))
  const rem = res?.rem
  const stop = new Set(rem ? [...rem.full, ...rem.cut] : [])
  const below = (u: Run) =>
    [...u.r.in.map((q) => q.name), ...(u.mode && res?.sp ? [res.sp.name] : [])]
      .filter((n) => !stop.has(n))
      .map((n) => runOf.get(n))
      .filter((v): v is Run => !!v && v !== u)
  const reach = (u: Run) => {
    const d = new Map<Run, number>()
    for (let level = [u], k = 1; level.length; k++) {
      const next: Run[] = []
      for (const v of level)
        for (const w of below(v)) {
          if (w === u || d.has(w)) continue
          d.set(w, k)
          next.push(w)
        }
      level = next
    }
    return d
  }
  const chosen = [...new Set(state.pick.map((n) => runOf.get(n)).filter((u): u is Run => !!u))]
  const reaches = new Map(chosen.map((u) => [u, reach(u)]))
  const tops = new Set(
    chosen.filter(
      (u) => !chosen.some((v) => v !== u && reaches.get(v)!.has(u) && !reaches.get(u)!.has(v)),
    ),
  )
  const inside = new Map<Run, { from: Run[]; d: number }>()
  for (const u of tops)
    for (const [w, d] of reaches.get(u)!) {
      if (tops.has(w)) continue
      const x = inside.get(w)
      if (x) {
        x.from.push(u)
        x.d = Math.min(x.d, d)
      } else inside.set(w, { from: [u], d })
    }
  return { rows, tops, inside }
}
