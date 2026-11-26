type AtlasEntry = readonly [name: string, page: number, row: number, column: number]

declare global {
  interface Window {
    CALC_ICONS: { cols: number; list: AtlasEntry[] }
  }
}

// Generated together by make-icons.py; the list index is the tile in both atlas images.
export const { cols: ICON_COLS, list: ICONS } = window.CALC_ICONS
export const ICON_AT = new Map(ICONS.map(([name], index) => [name, index]))
