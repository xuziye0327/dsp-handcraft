export { byId as element, esc, fmt } from './shared'
export const ROLE_NAMES = ['仓储', '供应', '需求']
export function savedSlot(itemId?: number) {
  if (itemId === 1210) return 'warper'
  return itemId === 1141 || itemId === 1142 || itemId === 1143 ? 'spray' : null
}
