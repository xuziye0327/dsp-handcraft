export interface ItemIcon {
  name: string
  id?: number
  icon?: string
  type?: number
}
export type CatalogItem = Extract<
  import('../worker.js').WorkerResponse,
  { type: 'catalog' }
>['list'][number]
export interface Target {
  id: number
  rate: number
}
export type { ForecastData as Forecast } from '../worker.js'
export const categoryColors: Record<number, string> = {
  1: '#9aa5b1',
  2: '#6f8fb3',
  3: '#5f9b8b',
  4: '#b48b52',
  5: '#7c80c0',
  6: '#4f7cc9',
  8: '#b56262',
  9: '#b56262',
  10: '#707070',
  11: '#9a72cf',
}
export const fmt = (n: number) =>
  Math.abs(n - Math.round(n)) < 1e-6 ? String(Math.round(n)) : n.toFixed(1)
export const tr = (text: string) => window.dsphcTr?.(text) ?? text
const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
export const esc = (text: unknown) => String(text).replace(/[&<>"]/g, (c) => entities[c])
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Missing generator element #${id}`)
  return el as T
}
export const signal = () => {
  let revision = 0
  const listeners = new Set<() => void>()
  return {
    snapshot: () => revision,
    subscribe(this: void, fn: () => void) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    update() {
      revision++
      for (const fn of listeners) fn()
    },
  }
}
