import type { Graph, Layout } from '../plan/domain.ts'
export type { Cell as XY, Tile, Chain, StationConnection } from '../plan/domain.ts'

// Some routing stages already have the belt geometry, but not the completed layout.
export type ChainLayout = Pick<Layout, 'legs' | 'segments'> & { labGaps?: Layout['labGaps'] | null }
export type EmitGraph = Pick<Graph, 'items'>
export type EmitLayout = ChainLayout &
  Pick<
    Layout,
    | 'width'
    | 'height'
    | 'origin'
    | 'rotated'
    | 'rows'
    | 'rowCy'
    | 'pos'
    | 'chains'
    | 'sorterList'
    | 'stations'
    | 'stores'
    | 'warperLinks'
    | 'proLines'
    | 'coaters'
    | 'pilers'
    | 'power'
  >
