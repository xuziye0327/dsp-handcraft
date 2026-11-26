import type { ProductionUnit } from '../calc/calculator.js'
import type { Factory, Side } from '../gamedata.js'
import type { groundOptions } from './ground.js'
import type { REROUTE, rerouteOptions } from './reroute.js'
import type { DEFAULTS } from './route.js'

export type Cell = [x: number, y: number]
export type Tile = [x: number, y: number, z: number]
export interface Point {
  x: number
  y: number
}
/** 一行从左到右的块 ID。行按从下到上排列；同一配方组可以拆到不同的行。 */
export type Row = string[]
export type Pads = Record<string, number>
export interface Block {
  gid: string
  n: number
}
export type Blocks = Record<string, Block>
export type IO = 'in' | 'out'
export interface Bay {
  r: number
  left: boolean
}
export interface SearchState {
  rows: Row[]
  blocks: Blocks
  pads: Pads
  streets?: number[]
  seq?: string[]
  W?: number
  bays?: Bay[]
  gaps?: string[]
}
export type GeometryStore = NonNullable<ProductionUnit['store']> & { key: number }
export interface Group extends Pick<
  Factory,
  | 'kind'
  | 'pitch'
  | 'center'
  | 'trailing'
  | 'bodyWidth'
  | 'bodyHeight'
  | 'bodyBelow'
  | 'bodyAbove'
  | 'edgeBelow'
  | 'edgeAbove'
  | 'edgeShiftBelow'
  | 'slots'
  | 'collider'
  | 'colliderShift'
  | 'latitude'
> {
  id: string
  letter: string
  itemId: number
  item: string
  recipeId: number
  inputs: number[]
  factoryId: number
  factory: string
  tap: number
  slotPos: Record<number, Cell> | null
  levels: number
  levelZ: number
  colCap: number
  noTop?: boolean
  sideItem?: number
  count: number
  width: number
  perFactory: number
  outputs: { itemId: number; perFactory: number }[]
  crafts: number | null
  outputRate: number
  store?: GeometryStore
}
export interface ItemFlow {
  itemId: number
  real: number
  byproduct: boolean
  name: string
  letter: string
  producer: string
  consumers: { to: string; rate: number }[]
  rate: number
  perFactory?: number
}
export interface Graph {
  groups: Group[]
  byId: Map<string, Group>
  items: Map<number, ItemFlow>
  target: number
}
export interface Position extends Block {
  bid: string
  g: Group
  row: number
  x0: number
  x1: number
  centers: number[]
  tmin: number
  tmax: number
}
export interface Channel {
  c: number
  tracks: number[]
  n: number
  h: number
  base: number
  wide?: boolean
}
export interface Tap {
  bid: string
  io: IO
  rate: number
}
/** 通道的一段地面带。劈开的第一段没有入口；没有下游时也没有出口。 */
export interface Segment {
  id: number
  itemId: number
  ch: number
  a: number
  b: number
  dir: number
  dout: number
  split: number | null
  cont: 'L' | 'R' | null
  entryX: number | null
  exitX: number | null
  fed: boolean
  rate: number
  taps: Tap[]
  track: number
  y: number
  sprayGap: 'in' | 'out' | 'mid' | 'legIn' | 'legOut' | 'edgeIn' | null
  gapX: number | null
  noTrackWith?: number[]
}
export interface LabGap {
  id: number
  itemId: number
  bid: string
  row: number
  x: number
  y0: number
  y1: number
  dout: number
  rate: number
  taps: { bid: string; building: number; cx: number; slot: number; dy: number; y: number }[]
}
export interface StationConnection {
  k: number
  slot: number
}
export interface Leg {
  id: number
  itemId: number
  kind: IO | 'link'
  rate: number
  cells: Tile[]
  from?: number
  to?: number
  gap?: number
  edge?: number
  py?: number
  xv?: number
  bus?: number
  station?: StationConnection
  store?: number
  direct?: boolean
  pre?: Tile[]
  stub?: Tile[]
  spray?: { seg: number; side: IO }
  level?: number
  broken?: boolean
  shadow?: Tile[]
  road?: 'trunk' | 'ring' | 'street' | 'local'
}
export type ChainPart =
  | { seg: number; leg?: never; gap?: never }
  | { leg: number; seg?: never; gap?: never }
  | { gap: number; leg?: never; seg?: never }
export interface Chain {
  ci?: number
  itemId: number
  parts: ChainPart[]
}
export interface Port extends Point {
  kind: IO
  itemId: number
  rate: number
  leg?: number
  direct?: boolean
  bus?: boolean
  station?: number
  slot?: number
  store?: number
  spray?: boolean
}
export interface Station extends Point {
  items: { itemId: number; role: 'supply' | 'demand' | 'warper' }[]
  ports: { slot: number; leg?: number; itemId: number; dir: IO; warper?: boolean; spray?: boolean }[]
  stack?: number
}
export interface Sorter {
  gid: string
  bid: string
  building: number
  cx: number
  side: Side
  io: IO
  itemId: number
  segId: number | null
  col: number
  length: number
  stub?: boolean
}
export interface Hole {
  row: number
  k: number
  shift: number
  x: number
}
export interface Penalty {
  kind: string
  amount: number
  msg: string
  bids?: string[] | null
}
export type PowerType = 'tesla' | 'substation'
export interface PowerOptions {
  localSearch?: boolean
  cellM?: number
  coverMargin?: number
  linkMargin?: number
  rowGaps?: boolean
  maxWidth?: number | null
  maxHeight?: number | null
}
export interface PowerPlacement {
  type: PowerType
  name: string
  itemId: number
  model: number
  size: number
  cover: number
  link: number
  nodes: Point[]
  uncovered: number
  options: PowerOptions
  extend: { left: number; right: number; bottom: number; top: number }
  warnings: string[]
}
export interface Store {
  kind: IO
  itemId: number
  rate: number
  type: number
  dist: boolean
  count: number
  layers: number
  minutes: number
  side: number
  gate: Cell
  boxes: Cell[]
  sorters: { box: number; slot: number; p0: Cell; p1: Cell; belt: Cell }[]
  tank: (Point & { slot: number; port: Cell }) | null
  rect: [number, number, number, number]
  leg?: number | null
  pro?: boolean
  inside?: boolean
}
export interface SpaceStats {
  space: number
  factory: number
  rows: number
  usedCells: number
  factoryCells: number
  area: number
}
export interface RerouteStats {
  nets: number
  passes: number
  kept: number
  switched: number
  flipped: number
  selfFix: number
  pops: number
  mapPops: number
  mapMs: number
  powMs: number
  setupMs: number
  passMs: number
  meets: number[] | null
  reverted: number
  repairMs: number
  ms: number
}
export interface RerouteGuard {
  tried: number
  used: number
  why: string[]
  ms: number
  tryMs: number[]
}
export interface Layout {
  rejected?: false
  rows: Row[]
  pads: Pads
  blocks: Blocks | null
  pos: Map<string, Position>
  rowCy: number[]
  rowBelow: number[]
  rowAbove: number[]
  channels: Channel[]
  segments: Segment[]
  legs: Leg[]
  ports: Port[]
  chains: Chain[]
  sides: Map<string, Record<Side, Map<number, IO>>>
  width: number
  height: number
  area: number
  fill: number
  belts: number
  airBelts: number
  longestBelt: number
  longestBeltItem: number | null
  sorters: number
  sorterList: Sorter[]
  sorterLengths: Record<number, number>
  factories: number
  penalties: Penalty[]
  penalty: number
  hot: string[]
  feasible: boolean
  powerPlan: {
    ext: PowerPlacement['extend']
    extraArea: number
    unreachable: number
    lonely: (Point & { what: string; bid?: string })[]
  } | null
  powerHoles: Hole[]
  streets: number[]
  roads: { trunk: number; ring: number; street: number; local: number; maxStack: number }
  trunk: number | null
  stations: Station[]
  holes: { cost: number; growth: number; dist: number; sites: Point[] } | null
  shape: { single: number; split: number; far: number; entries: number; long: number; cost: number }
  cost: number
  levelCost: number
  taste: { pyramid: number; turns: number; lifts: number; cost: number }
  quick: boolean
  labGaps?: LabGap[]
  noLift?: boolean
  rotated?: boolean
  stationMode?: string
  origin?: Point
  groundedBelts?: number
  pilers?: (Point & { chain: number; itemId: number; dx: number; dy: number })[]
  coaters?: (Point & { chain: number; itemId: number; ix: number; iy: number; z: number })[]
  proLines?: {
    cells: Tile[]
    station: StationConnection | null
    itemId: number
    rate: number
    edge: Cell | null
    store?: number
  }[]
  warperLinks?: { cells: Tile[]; from: StationConnection; to: StationConnection }[]
  warperNotes?: string[]
  power?: PowerPlacement
  powerReserve?: { type: PowerType; nodes: Point[] }
  stores?: Store[]
  storeNotes?: string[]
  stackShort?: string
  addonNotes?: string[]
  sprayMissed?: number
  reroute?: RerouteStats
  rerouteGuard?: RerouteGuard
  space?: SpaceStats
  finalCost?: number
}
/** 接站、供电等后处理完成，空间利用率和最终代价已按实际外框计算。 */
export interface FinishedLayout extends Layout {
  space: SpaceStats
  finalCost: number
}
export interface RejectedLayout {
  rejected: true
  cost: number
}
export interface Candidate<L extends Layout = Layout> extends SearchState {
  layout: L
}
export interface SearchResult extends Candidate {
  history: number[]
  candidates?: Candidate[]
}
export interface StationSlots {
  warper?: boolean
  keepFree?: boolean
}
export interface StationOption {
  place?: 'edge' | 'side'
  stack?: number
  slots?: StationSlots | null
}
export interface StationSetting {
  place: 'edge' | 'side'
  stack: number
  slots?: StationSlots | null
}
export interface FinishContext {
  station?: (StationOption & { place: 'edge' | 'side' }) | null
  power?: PowerType | null
  powerOptions?: PowerOptions
  maxWidth?: number | null
  maxHeight?: number | null
  noGrounding?: boolean
  aw?: number
  spray?: number
  sprayItems?: number[] | null
  sprayTo?: string[] | null
  pile?: boolean
  sprayRate?: number
  allowMissed?: boolean
  supply?: string | null
  sorter?: number
  storeLayers?: number
  stackCap?: number
  sorterStack?: number
  keepPre?: boolean
  ground?: ReturnType<typeof groundOptions>
  reroute?: ReturnType<typeof rerouteOptions>
}
export interface FinishedCandidate extends Candidate<FinishedLayout> {
  pre?: { layout: Layout; other: number }
  srcCtx?: FinishContext
  pileModel?: number
}
export type RejectFloor = (floor: number) => boolean
type Defaults = typeof DEFAULTS
export type RouteOptions = Partial<
  Omit<
    Defaults,
    | 'penalty'
    | 'station'
    | 'power'
    | 'powerOptions'
    | 'pileModel'
    | 'maxAspect'
    | 'maxBelt'
    | 'maxWidth'
    | 'maxHeight'
    | 'earlySorters'
    | 'sprayItems'
    | 'sprayTo'
  >
> & {
  penalty?: Partial<Defaults['penalty']>
  station?: StationOption | null
  power?: PowerType | null
  powerOptions?: PowerOptions
  pileModel?: number | null
  maxAspect?: number | null
  maxBelt?: number | null
  maxWidth?: number | null
  maxHeight?: number | null
  earlySorters?: boolean | 'auto'
  sprayItems?: number[] | null
  sprayTo?: string[] | null
  core?: 'auto' | 'master' | 'typeset'
  stationHoles?: boolean
  freeEnds?: boolean
  stationSlots?: StationSlots | null
  groundTax?: boolean
  capMoves?: boolean
  aspectTarget?: number
  autoSegments?: number
  allowMissed?: boolean
  splitCands?: boolean | number
  dedupCands?: boolean
  lanes?: number
  localSearch?: boolean
  streets?: boolean
  sprayGapOff?: string
  sprayOnLegs?: boolean
  reroute?: boolean | Partial<typeof REROUTE>
  [key: `tax${string}`]: number | boolean
  [key: `rr${string}`]: string | number | boolean | number[]
}
/** 只有就地评估邻域时才传回调，线程间传送的搜索配置不带函数。 */
export type EvaluationOptions = RouteOptions & { rejectFloor?: RejectFloor }
export type ResolvedRouteOptions = EvaluationOptions &
  Required<Pick<RouteOptions, keyof Defaults>> & { penalty: Defaults['penalty'] }
export interface CandidateRank {
  cost: number[]
  order: number[]
  ok: boolean[]
}
export interface WarmStart {
  seq: string[]
  W: number
  bays?: Bay[] | null
  gaps?: string[] | null
}
export interface Snapshot {
  graph: Graph
  s: number
  i: number
  iterations: number
  T: number
  layout: Layout
  cost: number
  best: Layout
  bestCost: number
  feasible: boolean
  accepted: number
}
export interface RoundProgress {
  round: number
  space: number
  feasible: boolean
  target: number
}
export interface PlanOptions {
  routeOptions?: RouteOptions
  iterations?: number
  restarts?: number
  seed?: number
  timeLimit?: number | null
  station?: StationOption | null
  power?: PowerType | 'none' | null
  powerOptions?: PowerOptions
  targetSpace?: number
  finishCount?: number
  noGrounding?: boolean
  adaptive?: boolean
  beltSlack?: number
  orient?: 'h' | 'v' | 'auto'
  core?: RouteOptions['core']
  autoSegments?: number
  aspectTarget?: number
  untilTarget?: {
    maxMs: number
    maxSegments?: number
    patience?: number
    patienceInfeasible?: number
  }
  stationHoles?: boolean
  freeEnds?: boolean
  powerHoles?: boolean
  groundTax?: boolean
  pile?: boolean
  supply?: string | null
  sorter?: number
  storeLayers?: number
  retries?: number
  feasibleFirst?: boolean
  warm?: WarmStart | null
  masterWarm?: Pick<SearchState, 'rows' | 'pads' | 'blocks'> | null
  onRound?: (info: RoundProgress) => void
  onSnapshot?: ((snapshot: Snapshot) => void) | null
  candidateLimit?: number
  snapshotMs?: number
  candRank?: CandidateRank | null
  initial?: Row[] | null
}

/** Stages initialize the fields in order: positions, belts, tracks, ports, then elevation/score. */
export interface RouteContext {
  graph: Graph
  rows: Row[]
  pads: Pads
  blocks: Blocks | null
  streets: number[]
  options: EvaluationOptions
  opt: ResolvedRouteOptions
  side: boolean
  R: number
  P: Defaults['penalty']
  penalties: Penalty[]
  addPenalty: (kind: string, amount: number, msg: string, bids?: string[] | null) => void
  holePlan: Hole[] | null
  addLoad: (x: number, c1: number, c2: number) => void
  atPort: (x: number, col: number) => boolean
  bestColumn: (
    xs: number,
    d0: number,
    xd: number,
    d1: number,
    c1: number,
    c2: number,
    g0min?: number,
  ) => { x: number; cost: number } | null
  blocksOf: Map<string, Position[]>
  corridor: number
  entryCol: (d: number) => number
  exitCol: (d: number) => number
  extraBottom: (p: Position) => number
  extraTop: (p: Position) => number
  itemBids: (itemId: number) => string[]
  pos: Map<string, Position>
  powerHoles: Hole[]
  rowAbove: number[]
  rowBelow: number[]
  stationX: number
  streetX: number[]
  xL: number
  xR: number
  beltCap: number
  chains: Chain[]
  legs: Leg[]
  pileCap: number
  rawCap: number
  segments: Segment[]
  sides: Layout['sides']
  labGaps: LabGap[] | null
  channels: Channel[]
  height: number
  rowCy: number[]
  ports: Port[]
  stations: Station[]
  roads?: Layout['roads']
  sorterPlan?: ReturnType<typeof import('./layout/score.js').sorterPlanOf>
  wantCounts?: { nTooLong: number; nSlow: number }
  elevAsk?: (c: RouteContext, nDead: number) => boolean
  elevRejected?: number
}
