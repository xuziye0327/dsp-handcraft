import type { IO } from './domain.js'

export const PORT_POSITIONS = {
  'top-left:left': { x: -1, y: 1, side: 'left', text: '左上 · 左' },
  'top-left:top': { x: -1, y: 1, side: 'top', text: '左上 · 上' },
  'top-right:top': { x: 1, y: 1, side: 'top', text: '右上 · 上' },
  'top-right:right': { x: 1, y: 1, side: 'right', text: '右上 · 右' },
  'bottom-right:right': { x: 1, y: -1, side: 'right', text: '右下 · 右' },
  'bottom-right:bottom': { x: 1, y: -1, side: 'bottom', text: '右下 · 下' },
  'bottom-left:bottom': { x: -1, y: -1, side: 'bottom', text: '左下 · 下' },
  'bottom-left:left': { x: -1, y: -1, side: 'left', text: '左下 · 左' },
} as const

export type PortPosition = keyof typeof PORT_POSITIONS
export type PortSide = (typeof PORT_POSITIONS)[PortPosition]['side']
export type PortPositions = Partial<Record<IO, PortPosition>>

export const clockwiseSide: Record<PortSide, PortSide> = {
  left: 'top',
  top: 'right',
  right: 'bottom',
  bottom: 'left',
}

function unrotate(position: PortPosition): PortPosition {
  const { x, y, side } = PORT_POSITIONS[position]
  const corner = `${x < 0 ? 'bottom' : 'top'}-${y > 0 ? 'left' : 'right'}`
  const edge = x < 0 ? 'bottom' : 'top'
  const column = y > 0 ? 'left' : 'right'
  return `${corner}:${side === 'left' || side === 'right' ? edge : column}` as PortPosition
}

export function unrotatePorts(positions?: PortPositions): PortPositions | undefined {
  if (!positions) return undefined
  return {
    in: positions.in && unrotate(positions.in),
    out: positions.out && unrotate(positions.out),
  }
}
