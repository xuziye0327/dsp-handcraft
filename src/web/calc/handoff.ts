import {
  builtNow,
  cleanBuilt,
  EPS,
  GAME_IDS,
  pickOf,
  PRODUCERS,
  setState,
  solve,
  state,
  type Built,
  type Result,
  type State,
} from './model'

const MAKERS: Record<string, { type: number; factories: number[] }> = {
  制作台: { type: 4, factories: [2303, 2304, 2305, 2318] },
  冶炼设备: { type: 1, factories: [2302, 2315, 2319] },
  化工设备: { type: 2, factories: [2309, 2317] },
  原油精炼机: { type: 3, factories: [2308] },
  粒子对撞机: { type: 5, factories: [2310] },
  研究站: { type: 15, factories: [2901, 2902] },
}
type Building = 'assembler' | 'smelter' | 'chemical' | 'lab'
const BP_KIND: Record<string, Building> = {
  制作台: 'assembler',
  冶炼设备: 'smelter',
  化工设备: 'chemical',
  研究站: 'lab',
}
interface Rate {
  id: number
  rate: number
}
interface RecipeDef {
  ID: number
  Type: number
  Factories: number[]
  Items: number[]
  ItemCounts: number[]
  Results: number[]
  ResultCounts: number[]
  TimeSpend: number
  Proliferator: number
}
interface Plan extends Partial<Record<Building, string>> {
  from: string
  targets: Rate[]
  ext: number[]
  recipes: Record<number, number>
  defs?: { items: { ID: number; Name: string }[]; recipes: RecipeDef[] }
  auto: false
  beltless?: true
  belt: string
  labstack: number
  pile: string
}
const itemNames = () => new Map(Object.entries(GAME_IDS).map(([name, id]) => [id, name]))
const needIn = (res: Result, name: string) =>
  res.rows.find((x) => x.name === name)?.need ?? res.raw.find((x) => x.name === name)?.need ?? 0

function withState<T>(temporary: State, fn: () => T): T {
  const previous = state
  setState(temporary)
  try {
    return fn()
  } finally {
    setState(previous)
  }
}

function blueprintPlan(res: Result): Plan {
  const ids = GAME_IDS
  const plan: Plan = {
    from: '量产量化计算器',
    targets: [],
    ext: [],
    recipes: {},
    belt: String(state.belt + 1),
    labstack: 15,
    pile: '1',
    auto: false,
  }
  for (const g of res.goals)
    if (ids[g.name]) plan.targets.push({ id: ids[g.name]!, rate: Number(g.rate.toFixed(3)) })
  for (const x of res.raw) {
    const minedByChoice = state.rare[x.name] && PRODUCERS.get(x.name)?.some((r) => !r.source)
    if (
      ids[x.name] &&
      (state.recipe[x.name] === 'ext' || state.recipe[x.name] === 'raw' || minedByChoice)
    )
      plan.ext.push(ids[x.name]!)
  }
  const defs: NonNullable<Plan['defs']> = { items: [], recipes: [] }
  const named = new Set<string>()
  const votes = new Map<Building, Map<number, number>>()
  for (const u of res.runs.values()) {
    const r = u.r
    if (r.gameId) for (const name of u.by) if (ids[name]) plan.recipes[ids[name]!] = r.gameId
    const maker = MAKERS[r.kind],
      all = [...r.q, ...r.s]
    if (maker && r.gameId && all.every((x) => ids[x.name])) {
      for (const x of all)
        if (!named.has(x.name)) {
          named.add(x.name)
          defs.items.push({ ID: ids[x.name]!, Name: x.name })
        }
      defs.recipes.push({
        ID: r.gameId,
        Type: maker.type,
        Factories: maker.factories,
        Items: r.q.map((x) => ids[x.name]!),
        ItemCounts: r.q.map((x) => x.n),
        Results: r.s.map((x) => ids[x.name]!),
        ResultCounts: r.s.map((x) => x.n),
        TimeSpend: Math.round(r.t * 60),
        Proliferator: r.noExtra === null ? 0 : r.noExtra ? 1 : 3,
      })
    }
    const kind = BP_KIND[r.kind],
      id = u.machine && ids[u.machine[0]]
    if (kind && id) {
      const tally = votes.get(kind) ?? new Map<number, number>()
      tally.set(id, (tally.get(id) || 0) + 1)
      votes.set(kind, tally)
    }
  }
  if (defs.recipes.length) plan.defs = defs
  for (const [kind, bk] of Object.entries(BP_KIND)) {
    const best =
      [...(votes.get(bk) ?? [])].sort(([a, x], [b, y]) => y - x || a - b)[0]?.[0] ??
      ids[state.kind[kind]!]
    if (best) plan[bk] = String(best)
  }
  return plan
}

/** Re-solve just the selected top-level runs; outstanding material from finished blueprints is external to the new plan. */
export function selectedPlan(res: Result): Plan | null {
  const { rows, tops, inside } = pickOf(res)
  const goalRows = rows.filter((x) => x.goal)
  if (!builtNow().length && goalRows.length && goalRows.every((x) => tops.has(x.u!)))
    return blueprintPlan(res)
  const rem = res.rem ?? res
  const own = new Set(rows.filter((x) => tops.has(x.u!) || inside.has(x.u!)).map((x) => x.name))
  function left(r: Result, name: string) {
    const row = r.rows.find((x) => x.name === name && x.u)
    if (!row) return 0
    let other = 0
    for (const u of r.runs.values())
      if (!u.by.some((n) => own.has(n)))
        for (const o of u.r.out) if (o.name === name) other += o.n * u.v * u.x
    return row.need - other - (row.part || 0)
  }
  let goals: State['goals'] = []
  for (const name of new Set([...res.goals.map((g) => g.name), ...rows.map((x) => x.name)])) {
    const row = rows.find((x) => x.name === name)
    if (!row?.u || !tops.has(row.u)) continue
    let rate = left(rem, name)
    if (rate <= 1e-6 && rem !== res) rate = left(res, name)
    if (rate > 1e-6) goals.push({ name, rate })
  }
  if (!goals.length) return null
  const recipe = { ...state.recipe }
  for (const n of [...rem.full, ...rem.cut]) if (!goals.some((g) => g.name === n)) recipe[n] = 'ext'
  if (goals.some((g) => rem.cut.has(g.name))) {
    const used = withState(
      { ...state, goals: goals.filter((g) => !rem.cut.has(g.name)), recipe, built: [] },
      solve,
    )
    goals = goals
      .map((g) => (rem.cut.has(g.name) ? { ...g, rate: g.rate - needIn(used, g.name) } : g))
      .filter((g) => g.rate > 1e-6)
  }
  return withState({ ...state, goals, recipe, built: [] }, () => blueprintPlan(solve()))
}

export function generatorSession(res: Result, plan: Plan, beltless: boolean) {
  if (beltless) plan.beltless = true
  const ext: Record<string, string> = {}
  const done = (res.rem ?? res).done,
    names = itemNames()
  for (const id of plan.ext) {
    const n = names.get(id)
    if (n && done.has(n)) ext[n] = 'ext'
  }
  const generator = new URL('../index.html', location.href)
  if (generator.protocol !== 'file:')
    generator.pathname = generator.pathname.replace(/\/index\.html$/, '/')
  generator.hash = `plan=${encodeURIComponent(JSON.stringify(plan))}`
  return { src: generator.href, ext }
}
export type GeneratorSession = ReturnType<typeof generatorSession>

type Rates = Record<string, number>
function entryFor(out: Rates, ext: Record<string, string>): Built {
  const goals = Object.entries(out).map(([name, rate]) => ({ name, rate }))
  const res = withState({ ...state, goals, recipe: { ...state.recipe, ...ext }, built: [] }, solve)
  const takes: Rates = {}
  for (const x of res.raw) if (ext[x.name] && x.bring > EPS) takes[x.name] = x.bring
  const parts: Built['parts'] = []
  ;[...res.runs.values()].forEach((u, group) => {
    if (!(u.count > 1e-6)) return
    let count = Math.ceil(u.count - 1e-6)
    for (const name of u.by) {
      const rate = u.r.out.find((o) => o.name === name)!.n * u.v * u.x
      if (rate <= EPS) continue
      parts.push({
        name,
        rate,
        machine: u.machine?.[0] ?? null,
        count,
        recipe: u.r.key,
        mode: u.mode,
        group,
      })
      count = 0
    }
  })
  return { out, takes, parts }
}
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const records = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter(record) : [])
export interface Done {
  targets: Record<string, unknown>[]
  kind: unknown
  made: unknown
}
export function readDone(v: unknown): Done | null {
  return record(v) && v.type === 'dsphc-done' && Array.isArray(v.targets)
    ? { targets: records(v.targets), kind: v.kind, made: v.made }
    : null
}
export function builtOf(
  { targets, made }: Done,
  res: Result,
  ext: Record<string, string>,
): Built | null {
  const own = new Set(res.rows.filter((r) => r.u).map((r) => r.name))
  const names = itemNames(),
    out: Rates = {},
    takes: Rates = {}
  for (const t of targets) {
    const n = names.get(Number(t.id)),
      rate = Number(t.rate)
    if (n && own.has(n) && Number.isFinite(rate) && rate > 0) out[n] = (out[n] || 0) + rate
  }
  if (!Object.keys(out).length) return null
  if (!record(made) || !Array.isArray(made.parts)) return entryFor(out, ext)
  for (const s of records(made.supplied)) {
    const n = names.get(Number(s.id)),
      rate = Number(s.rate)
    if (n && ext[n] && Number.isFinite(rate) && rate > EPS) takes[n] = (takes[n] || 0) + rate
  }
  const parts = records(made.parts).map((p) => ({
    name: names.get(Number(p.id)),
    rate: Number(p.rate),
    machine: names.get(Number(p.factory)) ?? null,
    count: Number(p.count),
    recipe: `g${Number(p.recipe)}`,
    mode: p.spray,
    group: Number(p.group),
  }))
  return cleanBuilt({ out, takes, parts }, true)
}

export function migrateDone(s: State) {
  const names = Object.keys(s.recipe).filter((n) => s.recipe[n] === 'done')
  if (!names.length) return
  for (const n of names) s.recipe[n] = 'ext'
  withState(s, () => {
    const needs = solve().raw.filter((x) => names.includes(x.name) && x.need > EPS)
    for (const n of names) delete s.recipe[n]
    for (const x of needs) s.built.push(entryFor({ [x.name]: x.need }, {}))
  })
}
