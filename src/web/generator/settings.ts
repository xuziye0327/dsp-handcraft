import { readDefs, type HandoffPlan } from '../handoff.js'
import type { GeneratorParams } from '../types/worker'
import { groups, type OptionName } from './options'
import type { Target } from './shared'

const STORE = 'dsp-handcraft:settings'
export type SavedOption = Exclude<OptionName, 'logistics'>
export const defaults: Record<SavedOption, string> = {
  assembler: '2303',
  smelter: '2302',
  chemical: '2309',
  lab: '2901',
  belt: '3',
  sorter: '2014',
  power: 'substation',
  station: 'ils',
  pile: '1',
  pilertech: '0',
  spray: '0',
  warper: '0',
  maxwidth: '',
  maxheight: '',
  aspect: '',
  effort: 'normal',
  chemwide: '0',
  supply: '',
  dist: '0',
  fracengine: 'template',
}
export type RolePrefs = { localRole: number; remoteRole: number; max: number }
export interface StationPreferences {
  station?: Record<string, number | boolean>
  spray?: RolePrefs
  warper?: RolePrefs
}
export interface Settings extends Record<SavedOption, string> {
  targets: Target[]
  ext: Set<string>
  recipes: Record<number, number>
  rare: boolean
  rareOff: number[]
  labstack: number
  page: number
  orient: string
  defs: ReturnType<typeof readDefs>
  boxPick: string
  stationPrefs: StationPreferences | null
  legacyTarget: string | null
}
export type Handoff = HandoffPlan & {
  took?: boolean
  pruned?: boolean
  ran?: boolean
}
export const labStack = (v: unknown) => Math.max(1, Math.min(15, Math.round(Number(v)) || 15))
export const limitValue = (v: unknown) =>
  String(Math.max(0, Math.min(9999, Math.round(Number(v) || 0))) || '')
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
const savedOptions = Object.keys(defaults) as SavedOption[]
function readStationPrefs(input: unknown): StationPreferences | null {
  const prefs = record(input),
    out: StationPreferences = {}
  for (const kind of ['spray', 'warper'] as const) {
    const { localRole, remoteRole, max } = record(prefs[kind])
    if (typeof localRole === 'number' && typeof remoteRole === 'number' && typeof max === 'number')
      out[kind] = { localRole, remoteRole, max }
  }
  const entries = Object.entries(record(prefs.station)).filter(
    (entry): entry is [string, number | boolean] =>
      typeof entry[1] === 'number' || typeof entry[1] === 'boolean',
  )
  if (entries.length) out.station = Object.fromEntries(entries)
  return Object.keys(out).length ? out : null
}
function option(key: SavedOption, v: unknown) {
  if (key === 'maxheight' || key === 'maxwidth') return limitValue(v)
  return groups[key].choices.some((c) => c.value === String(v)) ? String(v) : defaults[key]
}
export function loadSettings(): { state: Settings; firstVisit: boolean } {
  let s: Record<string, unknown> = {},
    firstVisit = false
  try {
    const raw = localStorage.getItem(STORE)
    firstVisit = !raw
    s = record(JSON.parse(raw || '{}'))
  } catch {
    /* Private storage or an invalid older save. */
  }
  const options = { ...defaults }
  if (s.supply === 'box-s' || s.supply === 'box-l') s.supply = s.supply.replace('box', 'side')
  for (const k of savedOptions) options[k] = option(k, s[k])
  const targets = Array.isArray(s.targets)
    ? s.targets.map(record).map((t) => ({ id: Number(t.id), rate: Number(t.rate) || 60 }))
    : []
  const state: Settings = {
    ...options,
    targets: targets.length
      ? targets
      : [{ id: Number(s.targetId ?? 6005), rate: Number(s.rate ?? 60) }],
    legacyTarget: !targets.length && typeof s.target === 'string' ? s.target : null,
    ext: new Set(
      Array.isArray(s.ext)
        ? s.ext.filter((x): x is string => typeof x === 'string')
        : typeof s.raw === 'string'
          ? s.raw.split(/[,，、\s]+/).filter(Boolean)
          : [],
    ),
    recipes: Object.fromEntries(
      Object.entries(record(s.recipes))
        .filter(([k, v]) => Number(k) > 0 && Number(v) > 0)
        .map(([k, v]) => [k, Number(v)]),
    ),
    rare: Object.keys(s).length === 0 || s.rare === true,
    rareOff: [
      ...new Set(Array.isArray(s.rareOff) ? s.rareOff.map(Number).filter((n) => n > 0) : []),
    ],
    defs: readDefs(s.defs),
    labstack: labStack(s.labstack),
    page: Number(s.page) === 2 ? 2 : 1,
    orient: s.orient === 'auto' && s.orientPicked ? 'auto' : s.orient === 'v' ? 'v' : 'h',
    boxPick:
      s.boxPick === 'side-l' || s.boxPick === 'side-s' ? s.boxPick : options.supply || 'side-s',
    stationPrefs: readStationPrefs(s.stationPrefs),
  }
  return { state, firstVisit }
}
export function persist(state: Settings) {
  try {
    localStorage.setItem(
      STORE,
      JSON.stringify({
        ...state,
        legacyTarget: undefined,
        ext: [...state.ext],
        orientPicked: state.orient === 'auto',
      }),
    )
  } catch {
    /* Settings remain usable without persistent storage. */
  }
}
export function applyHandoff(s: Settings, h: Handoff) {
  s.targets = h.targets.map((t: Target) => ({ ...t }))
  s.ext.clear()
  s.legacyTarget = null
  s.recipes = { ...h.recipes }
  s.defs = h.defs
  for (const [name, v] of Object.entries(h.options)) {
    const k = name as SavedOption
    if (k in defaults && groups[k].choices.some((c) => c.value === v)) s[k] = String(v)
  }
  if (h.labstack) s.labstack = labStack(h.labstack)
}
export function valueOf(s: Settings, k: OptionName) {
  return k === 'logistics' ? (s.station ? 'station' : s.supply ? 'box' : '') : s[k]
}
export function chooseOption(s: Settings, k: OptionName, v: string) {
  if (k === 'logistics') {
    s.station = v === 'station' ? 'ils' : ''
    s.supply = v === 'box' ? s.boxPick : ''
    return
  }
  s[k] = option(k, v)
  if (k === 'supply' && s.supply) s.boxPick = s.supply
  if (k === 'aspect' && s.aspect) {
    s.maxwidth = ''
    s.maxheight = ''
  }
  if ((k === 'maxwidth' || k === 'maxheight') && s[k]) s.aspect = ''
}
export function buildParams(s: Settings, h: Handoff | null) {
  const options = { ...defaults }
  for (const k of savedOptions) options[k] = s[k]
  return {
    targets: s.targets.map((t) => ({ target: t.id, rate: t.rate })),
    raw: [...s.ext],
    recipes: { ...s.recipes },
    rare: s.rare && !h,
    rareOff: [...s.rareOff],
    ...options,
    power: s.power === 'substation' || s.power === 'tesla' ? s.power : '',
    effort: s.effort === 'fine' ? 'fine' : 'normal',
    stationPrefs: s.stationPrefs,
    orient: 'h',
    labstack: s.labstack,
  } satisfies GeneratorParams
}
export type PlanParams = ReturnType<typeof buildParams>
