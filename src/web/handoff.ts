import type { GameData, RawItem, RawRecipe } from '../engine/gamedata.ts'

const OPTION_KEYS = ['assembler', 'smelter', 'chemical', 'lab', 'belt', 'sorter', 'pile'] as const
export type HandoffDefs = GameData
export interface HandoffPlan {
  targets: { id: number; rate: number }[]
  ext: number[]
  recipes: Record<number, number>
  options: Partial<Record<(typeof OPTION_KEYS)[number], string>>
  labstack: number | null
  defs: GameData | null
  auto: boolean
  from: string | null
  beltless: boolean
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'
const id = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x > 0
const positive = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0
const name = (x: unknown) => (typeof x === 'string' ? x.trim().slice(0, 40) : '')
const ids = (x: unknown): x is number[] => Array.isArray(x) && x.length > 0 && x.every(id)
const counts = (x: unknown, n: number): x is number[] =>
  Array.isArray(x) && x.length === n && x.every(positive)

/** Decode a calculator's URI-encoded #plan= payload. All identifiers use game IDs. */
export function readHandoff(hash?: string | null): HandoffPlan | null {
  const m = /(?:^#|&)plan=([^&]*)/.exec(hash || '')
  if (!m) return null
  let p: unknown
  try {
    p = JSON.parse(decodeURIComponent(m[1]))
  } catch {
    return null
  }
  if (!record(p) || !Array.isArray(p.targets)) return null
  const targets = p.targets
    .filter(record)
    .map((t) => ({ id: Number(t.id), rate: Number(t.rate) }))
    .filter((t) => t.id > 0 && t.rate > 0)
  if (!targets.length) return null
  const ext = [...new Set((Array.isArray(p.ext) ? p.ext : []).map(Number).filter((x) => x > 0))]
  const recipes: HandoffPlan['recipes'] = {}
  for (const [k, v] of Object.entries(record(p.recipes) ? p.recipes : {}))
    if (Number(k) > 0 && Number(v) > 0) recipes[Number(k)] = Number(v)
  const options: HandoffPlan['options'] = {}
  for (const k of OPTION_KEYS) {
    const value = p[k]
    if (typeof value === 'number' || (typeof value === 'string' && value !== ''))
      options[k] = String(value)
  }
  const labstack = Number(p.labstack) > 0 ? Number(p.labstack) : null
  const beltless = p.beltless === true
  return {
    targets,
    ext,
    recipes,
    options,
    labstack,
    defs: readDefs(p.defs),
    auto: p.auto !== false && !beltless,
    from: typeof p.from === 'string' ? p.from.slice(0, 40) : null,
    beltless,
  }
}

/** Validate both imported and locally saved definitions before adding them to the game catalog. */
export function readDefs(d: unknown): GameData | null {
  if (!record(d)) return null
  const items: RawItem[] = []
  for (const it of Array.isArray(d.items) ? d.items : [])
    if (record(it) && id(it.ID) && name(it.Name)) items.push({ ID: it.ID, Name: name(it.Name) })
  const recipes: RawRecipe[] = []
  for (const r of Array.isArray(d.recipes) ? d.recipes : []) {
    if (
      !record(r) ||
      !id(r.ID) ||
      !ids(r.Items) ||
      !counts(r.ItemCounts, r.Items.length) ||
      !ids(r.Results) ||
      !counts(r.ResultCounts, r.Results.length) ||
      !ids(r.Factories) ||
      !positive(r.TimeSpend)
    )
      continue
    recipes.push({
      ID: r.ID,
      Type: typeof r.Type === 'number' && Number.isInteger(r.Type) ? r.Type : 4,
      Factories: [...r.Factories],
      Name: name(r.Name),
      Items: [...r.Items],
      ItemCounts: [...r.ItemCounts],
      Results: [...r.Results],
      ResultCounts: [...r.ResultCounts],
      TimeSpend: r.TimeSpend,
      Proliferator: r.Proliferator === 1 || r.Proliferator === 3 ? r.Proliferator : 0,
    })
  }
  return items.length || recipes.length ? { items, recipes } : null
}
export function handoffHash(plan: unknown) {
  return `#plan=${encodeURIComponent(JSON.stringify(plan))}`
}
