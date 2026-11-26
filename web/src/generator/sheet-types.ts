import type { Floor as RouteFloor } from '../types/drawing'
import type { PlanResult as WorkerPlan, WorkerRequest, WorkerResponse } from '../worker'
import type { StationPreferences } from './settings'
export type {
  DrawingModel as SheetModel,
  DrawingGroup as MachineGroup,
  DrawingSorter as Sorter,
  Floor as RouteFloor,
  FloorRun as RouteRun,
  Cell,
} from '../types/drawing'
export type SheetResult = Exclude<WorkerPlan, { error: string }>
export type PatchRequest = Extract<WorkerRequest, { type: 'patch' }>
export type PatchData = Extract<WorkerResponse, { type: 'patched' }>['data']
export type StationConfig = SheetResult['stationCfg'][number]
export type StationSettings = NonNullable<PatchRequest['set']>
export type StorageValues = NonNullable<NonNullable<PatchRequest['storage']>[number]>
export type StationPrefs = StationPreferences
export type SheetEnergy = Pick<
  SheetResult['energy'],
  'idleText' | 'workText' | 'sprayText' | 'maxText' | 'stations' | 'stationChargeText' | 'gens'
>
export type FloorLevel = number | 'all'
export interface SheetView {
  level: FloorLevel
  focus: string
  selected: string
  factory: string
  station: number | null
  machine: string | null
  buildings: boolean
  sorters: boolean
  power: boolean
}
export interface RecipeTile {
  id: number
  count: number
  rate?: number | null
}
export interface SheetContext {
  readonly last: SheetResult | null
  readonly flat: boolean
  readonly floors: RouteFloor[]
  readonly view: SheetView
  readonly state: { stationPrefs?: StationPrefs | null }
  readonly busy: boolean
  readonly byId: ReadonlyMap<number, { name: string }>
  readonly viewer: {
    attach(svg: SVGSVGElement): void
    refresh(): void
    fit(): void
    zoomBy(factor: number): void
  }
  send(message: PatchRequest): void
  setStatus(message: string, warn: boolean): void
  saveSettings(): void
  outBlueprint(text: string): string
  pic(item: { name: string }): string
  drawIcon: (itemId: number) => string | null
}
