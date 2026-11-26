export interface Point2 {
  x: number
  y: number
}

export interface Point3 extends Point2 {
  z: number
}

export interface StationStorage {
  itemId: number
  localRole: number
  remoteRole: number
  max: number
  lockAmount: number
}

export interface StationSlot {
  dir: number
  storageIdx: number
}

// Unrecognised flag words survive decoding, alongside the usual true/false values.
export type Flag = boolean | number

export interface StationSettings {
  workEnergyPerTick?: number
  tripRangeOfDrones?: number
  tripRangeOfShips?: number
  includeOrbitCollector?: Flag
  warpEnableDistance?: number
  warperNecessary?: Flag
  deliveryAmountOfDrones?: number
  deliveryAmountOfShips?: number
  pilerCount?: number
  miningSpeed?: number
  droneAutoReplenish?: Flag
  shipAutoReplenish?: Flag
}

// Only the fields selected by the building's itemId are present. Missing settings
// are valid on newly placed buildings; the parameter codec writes zero words for them.
export interface BuildingParameters extends StationSettings {
  storage?: StationStorage[]
  slots?: StationSlot[]
  bans?: number
  storageType?: number
  filters?: number[]
  autoPickEnabled?: Flag
  autoReplenishFleet?: Flag
  moduleEnabled?: Flag
  autoReconstruct?: Flag
  droneEnabled?: Flag
  dronesPriority?: number
  fighters?: number[]
  priority?: Flag[]
  researchMode?: number
  acceleratorMode?: number
  iconId?: number
  count?: number | string
  length?: number
  output?: Flag
  input?: Flag
  orbitId?: number
  tenfoldSpeed?: Flag
  productId?: number
  mode?: number
  targetBeltId?: number
  offset?: number
  targetCargoAmount?: number
  periodTicksCount?: number
  passOperator?: number
  passColorId?: number
  failColorId?: number
  cargoFilter?: number
  spawnItemOperator?: number
  systemWarningMode?: number
  systemWarningIconId?: number
  alarmMode?: number
  tone?: number
  falloffRadius?: number[]
  repeat?: Flag
  pitch?: number
  volume?: number
  playerMode?: number
  storageMode?: number
  courierAutoReplenish?: Flag
  group?: number
  vsSettings?: number[]
  phasePos?: number
  _defaultParams?: Int32Array | Record<number, number>
}

export interface StationParameters extends BuildingParameters {
  storage: StationStorage[]
  slots: StationSlot[]
}

export interface Building {
  index: number
  areaIndex: number
  itemId: number
  modelIndex: number
  localOffset: [Point3, Point3]
  yaw: [number, number]
  tilt: number
  pitch: number
  tilt2: number
  pitch2: number
  outputObjIdx: number
  inputObjIdx: number
  outputToSlot: number
  inputFromSlot: number
  outputFromSlot: number
  inputToSlot: number
  outputOffset: number
  inputOffset: number
  recipeId: number
  filterId: number
  parameters: BuildingParameters | null
  itemName?: string
  extra102?: number
}

export interface Area {
  index: number
  parentIndex: number
  tropicAnchor: number
  areaSegments: number
  anchorLocalOffset: Point2
  size: Point2
}

type BlueprintTime = Date | string | number

export interface BlueprintHeader<Time extends BlueprintTime = BlueprintTime> {
  layout: number
  icons: number[]
  time: Time
  gameVersion: string
  shortDesc: string
  desc: string
}

export interface Blueprint<Time extends BlueprintTime = BlueprintTime> {
  header: BlueprintHeader<Time>
  version: number
  cursorOffset: Point2
  cursorTargetArea: number
  dragBoxSize: Point2
  primaryAreaIdx: number
  areas: Area[]
  buildings: Building[]
}
