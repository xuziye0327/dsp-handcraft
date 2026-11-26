import type { Blueprint as GameBlueprint, Building } from '../codec/types.ts'

// DSQ writes the older building record without the four pitch/tilt words.
type Angles = 'tilt' | 'tilt2' | 'pitch' | 'pitch2'
export type DsqBuilding = Omit<Building, Angles> & Partial<Pick<Building, Angles>>
export interface DsqRate {
  name: string
  rate: number
}
export type DsqSubRecipe =
  | { building: null; output: DsqRate[]; input: null; acceleratorMode: -1; recipeID: 0 }
  | {
      building: { name: string; num: number }
      output: DsqRate[]
      input: DsqRate[]
      acceleratorMode: -1 | 0 | 1
      recipeID: number
    }
export interface DsqRecipe {
  proliferator: string | null
  subRecipes: DsqSubRecipe[]
}
export interface DsqConfig {
  maxSorterNumOneBelt: number
  conveyorBeltStackLayer: number
  x_y_ratio: number
  compactLayout: boolean
  upgradeConveyorBelt: boolean
  onlyConveyorBeltMk3: boolean
  onlySorterMk3: boolean
  maxLabLayers: number
  selfSpray: boolean
  generateTeslaTower: boolean
  teslaTowerInterval: number
  teslaTowerLineInterval: number
  onlyConveyorBeltMk3Downgrade: boolean
}
export interface DsqPlan {
  title: string
  icons: number[]
  recipe: DsqRecipe
  config: DsqConfig
  desc?: string
  layout?: number
}
export const productionCategory: {
  smelter: 0
  assembling: 1
  plant: 2
  refinery: 3
  collider: 4
  lab: 5
}
export const itemMap: Record<string, { name: string; iconId: number; remark?: string }>
export const buildingMap: Record<string, { itemId: number; modelIndex: number; category?: number }>
export class Blueprint {
  constructor(title: string, icons: number[], recipe: DsqRecipe, config: DsqConfig)
  buildings: DsqBuilding[]
  itemSummary: Record<
    string,
    { fromBuildingNum: number; toBuildingNum: number; rate: number; inputRate: number }
  >
  sorters: Record<string, { output?: { index: number; rate: number }[] }>
  blueprintTemplate: Omit<GameBlueprint, 'buildings'> & { buildings: DsqBuilding[] }
  init(): void
  generateBuildings(): void
  generateConveyorBelts(): void
  generateConveyorBeltsForSprayCoater(): void
  toStr(): string
}
