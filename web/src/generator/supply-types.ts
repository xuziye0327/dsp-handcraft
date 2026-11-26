import type { WorkerRequest, WorkerResponse } from '../worker'
import type { CatalogItem } from './shared'

export type ChainData = Extract<WorkerResponse, { type: 'chain' }>['data']
export type ChainRequest = Extract<WorkerRequest, { type: 'chain' }>
export type NamedItem = Pick<CatalogItem, 'id' | 'name'>
type WorkerUnit = ChainData['units'][number]
type ProductionMode = 'line' | 'external' | 'dropped'
type SupplyMode = ProductionMode | 'raw' | 'by'

// All cards have a material identity and rate. Only a manufactured item has a factory/count.
export interface Unit extends NamedItem {
  type?: number
  rate: number
  state: SupplyMode
  count?: number
  factory?: string
  levels?: number | null
  out?: number
  co?: number | null
}
export interface Flow extends Omit<ChainData['edges'][number], 'state'> {
  state: SupplyMode
  via?: boolean
}
type WorkerChoice = ChainData['recipes'][number]
type Alternative = WorkerChoice['alts'][number] & { id: number }
export interface SupplyChain extends Omit<ChainData, 'goals' | 'units' | 'edges' | 'recipes'> {
  goals: Unit[]
  units: Unit[]
  edges: Flow[]
  recipes: (Omit<WorkerChoice, 'alts'> & { alts: Alternative[] })[]
}
function productionMode(state: string): ProductionMode {
  if (state === 'line' || state === 'external' || state === 'dropped') return state
  throw new Error(`Unknown production state: ${state}`)
}
function unit(u: WorkerUnit): Unit {
  return { ...u, state: productionMode(u.state) }
}
export function supplyChain(data: ChainData): SupplyChain {
  return {
    ...data,
    goals: data.goals.map((g) => ({ ...unit(g), out: g.out })),
    units: data.units.map(unit),
    edges: data.edges.map((e) => ({
      ...e,
      state: e.state === 'raw' || e.state === 'by' ? e.state : productionMode(e.state),
    })),
    recipes: data.recipes.map((choice) => ({
      ...choice,
      // Mining is represented by a null default recipe. Only numbered alternatives can be selected.
      alts: choice.alts.filter((a): a is Alternative => a.id != null),
    })),
  }
}
export interface SupplyState {
  targets: { id: number; rate: number }[]
  recipes: Record<number, number>
  ext: Set<string>
  rare: boolean
  rareOff: number[]
  lab: string | number
  labstack: number
}
export interface SupplyAppearance {
  getItem(id: number): Pick<CatalogItem, 'id' | 'name' | 'type'> | undefined
  pic(item: NamedItem): string
  categoryColor(type: number): string | undefined
}
export interface SupplyContext extends SupplyAppearance {
  state: SupplyState
  getHandoff(): { pruned?: boolean; auto?: boolean; ran?: boolean } | null | undefined
  getForecast(): { autoExt?: string[] } | null | undefined
  send(message: ChainRequest): void
  saveSettings(): void
  hideSuggestion(): void
  setStatus(text: string, isErr?: boolean): void
}
export interface SupplyGraph {
  nodes: Unit[]
  edges: Flow[]
}
