import type { Calculation, Target } from '../../engine/calc/calculator.ts'
import type { StationStorage, StationSettings } from '../../engine/codec/types.ts'
import type { EmitOptions } from '../../engine/emit/blueprint.ts'
import type { GameData } from '../../engine/gamedata.ts'
import type { PlanOptions } from '../../engine/plan/domain.ts'
import type { WorkerTask, WorkerResult } from '../../engine/plan/tasks.ts'
import type { DrawingModel } from './drawing.js'

export type EffortName = 'quick' | 'normal' | 'fine'
type Field = string | number
export interface GeneratorParams {
  targets?: Target[]
  target?: Field
  rate?: Field
  recipes?: Record<number, number>
  raw?: string[]
  rare?: boolean
  rareOff?: number[]
  assembler?: Field
  smelter?: Field
  chemical?: Field
  lab?: Field
  labstack?: Field
  belt?: Field
  sorter?: Field
  pilertech?: Field
  chemwide?: string
  spray?: Field
  aspect?: Field
  maxwidth?: Field
  maxheight?: Field
  orient?: PlanOptions['orient']
  power?: '' | 'tesla' | 'substation'
  station?: string
  supply?: string
  dist?: string
  stationPrefs?: EmitOptions['stationPrefs']
  warper?: string
  pile?: Field
  core?: PlanOptions['core']
  effort?: EffortName
  again?: number
  fracengine?: string
}
export interface ChainParams extends Pick<
  GeneratorParams,
  'raw' | 'recipes' | 'rare' | 'rareOff' | 'lab'
> {
  targets: Target[]
  labStack?: Field
}
export interface StationPatch {
  str: string
  k: number
  storage?: (Pick<StationStorage, 'localRole' | 'remoteRole' | 'max'> | null)[]
  set?: StationSettings | null
}
export type PlannerTask = WorkerTask & { gen?: number }
export type BenchTask = { kind: 'bench'; calc: Calculation; options: PlanOptions }
export type HelperTask = PlannerTask | BenchTask | { kind: 'ping' }
export interface SnapshotData {
  s: number
  i: number
  iterations: number
  T: number
  cost: number
  best: number
  feasible: boolean
  space: number | null
  model: DrawingModel | null
}
export type WorkerRequest =
  | { type: 'init'; url?: string; workerType?: WorkerType; threads?: number }
  | { type: 'defs'; defs: GameData }
  | { type: 'bench' }
  | { type: 'catalog'; id: number; raw?: string[] }
  | { type: 'chain'; id: number; params: ChainParams }
  | { type: 'plan' | 'forecast'; id: number; params: GeneratorParams }
  | { type: 'cancel'; id: number }
  | { type: 'watch'; id: number; round: number | null }
  | ({ type: 'patch'; id: number } & StationPatch)
  | {
      type: 'beltless'
      id: number
      params: GeneratorParams & { targets: Target[] }
      zoneAt?: { side: 'top' | 'bottom' | 'left' | 'right'; offset: number }
      partShift?: [number, number][]
    }
  | { type: 'task'; id: number; task: HelperTask }
export interface ProgressMessage {
  type: 'progress'
  id: number
  est?: number
  live?: boolean
  maxMs?: number | null
  search?: [number, number]
  finish?: [number, number]
  round?: number
  best?: number
  feasible?: boolean
  target?: number
}
export type PreviewMessage = Omit<SnapshotData, 'space' | 's'> & {
  type: 'preview'
  id: number
  gen: number
  round: number
}
type Results = { [K in WorkerTask['kind']]: WorkerResult<Extract<WorkerTask, { kind: K }>> } & {
  ping: 'pong'
  bench: number
}
export type HelperResult<T extends HelperTask> = Results[T['kind']]
export type HelperReply =
  | { id: number; progress: SnapshotData }
  | { id: number; result: HelperResult<HelperTask> }
  | { id: number; error: string }
