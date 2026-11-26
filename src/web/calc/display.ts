import { SHOWN } from './model'

export const shown = (name: string) => SHOWN[name] || name
export const quoteAll = (names: string[]) => names.map((n) => `「${n}」`).join('、')

export function num(value: number) {
  const a = Math.abs(value)
  const digits = a >= 100 ? 1 : a >= 1 ? 2 : 3
  return Number(value.toFixed(digits)).toLocaleString('zh-CN', { maximumFractionDigits: digits })
}

export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const e = document.getElementById(id)
  if (!e) throw new Error(`Missing calculator element #${id}`)
  return e as T
}
export type Commit = (change: () => void) => void
export type Notice = (text: string, undo?: () => void, ms?: number) => void
