export interface Point {
  x: number
  y: number
}
export type Cell = number[]
export interface DrawingRoute {
  itemId: number
  cells: Cell[]
  inPort?: boolean
  outPort?: boolean
}
export interface DrawingGroup {
  id: string
  letter: string
  item: string
  factory: string
  kind: string
  count: number
  centers: number[]
  factoryId?: number
  groupCount?: number
  levels?: number
  levelZ?: number
  yaw?: number
  w?: number
  h?: number
  below?: number
  above?: number
  shift?: number[] | null
  store?: { kind: string; dist: boolean; tank: boolean }
  recipe?: {
    name: string
    time: number
    crafts: number | null
    inputs: { id: number; count: number }[]
    outputs: { id: number; count: number; rate: number | null }[]
  } | null
}
export interface DrawingSorter {
  x: number
  x1?: number
  y0: number
  y1: number
  io: string
  itemId: number
  factoryItem: string
  len?: number
}
export interface DrawingModel {
  width: number
  height: number
  rotated?: boolean
  origin?: Point
  rows: { cy: number; groups: DrawingGroup[] }[]
  items: Record<number, { name: string; letter: string; rate: number }>
  segments: {
    id: number
    itemId: number
    a: number
    b: number
    y: number
    dir: number
    split?: number | null
    rate: number
  }[]
  legs: { itemId: number; kind: string; level?: number; cells: Cell[]; road?: string }[]
  sorters: DrawingSorter[]
  power: { name: string; size: number; cover: number; nodes: Point[] } | null
  stations: Point[]
  stationSites?: Point[]
  stubs: { itemId: number; cells: Cell[] }[]
  routes: DrawingRoute[]
  devices: (Point & { kind: string })[]
  stores?: {
    kind: string
    itemId: number
    type: number
    dist: boolean
    layers: number
    boxes: Cell[]
    tank: Point | null
  }[]
  streets: number[]
  trunk: number | null
}
export interface FloorRun {
  z: number
  itemId: number
  cells: Cell[]
  prev: FloorRun | null
  from?: Cell
  to?: Cell
}
export interface Via extends Point {
  itemId: number
  to: number
  direction: number
}
export interface Floor {
  z: number
  runs: FloorRun[]
  vias: Via[]
  items: Set<string>
  cells: Set<string>
}
export type Icon = (itemId: number) => string | null | undefined
export interface DrawingOptions {
  level?: number | 'all'
  focus?: string
  selected?: string
  buildings?: boolean
  sorters?: boolean
  power?: boolean
  mini?: boolean
  id?: string
  label?: string
  icon?: Icon | null
}
export type SvgText = (
  x: number,
  y: number,
  value: number | string,
  size?: number,
  color?: string,
  weight?: number,
  extra?: string,
) => string
export type SvgTag = (
  x: number,
  y: number,
  letter: string,
  num: number | null | undefined,
  size: number,
) => string
export interface ShapeOptions {
  hatch: string
  letter: string
  num?: number
  levels?: number
  yaw?: number
  mini?: boolean
  hidden?: boolean
  text: SvgText
  tag: SvgTag
}
export interface InspectedBuilding {
  index: number
  itemId: number
  at: Cell[]
  yaw: number
  out: number
  in: number
  product: number
  filter: number
  label: number
}
export interface BeltlessPart {
  kind: string
  members: number[]
}
