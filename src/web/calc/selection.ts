import { useLayoutEffect, useReducer } from 'react'

import { element, quoteAll, type Notice } from './display'
import { active, pickOf, save, state, type Result } from './model'

type Picks = ReturnType<typeof pickOf>
function rowElement(name: string) {
  return [
    ...element('body').querySelectorAll<HTMLTableRowElement>('.list tbody tr[data-item]'),
  ].find((tr) => tr.dataset.item === name)
}
function flash(el: HTMLElement, cls: string) {
  el.classList.remove(cls)
  void el.offsetWidth
  el.classList.add(cls)
}
function pickHint({ rows, tops }: Picks) {
  if (!rows.length) return ''
  if (!tops.size) return '点清单里的物品选进蓝图，可多选，它要用的东西一起做'
  const names = rows.filter((row) => tops.has(row.u)).map((row) => row.name)
  const goals = rows.filter((row) => row.goal)
  const what =
    names.length > 3 ? `${quoteAll(names.slice(0, 3))}等 ${names.length} 样` : quoteAll(names)
  return goals.length && goals.every((row) => tops.has(row.u))
    ? '蓝图做整条线'
    : `蓝图做${what}，连同${names.length > 1 ? '它们' : '它'}要用的`
}
export function useSelection(res: Result, notify: Notice) {
  const [version, redraw] = useReducer((v: number) => v + 1, 0)
  function selectItem(name: string) {
    const { rows, tops, inside } = pickOf(res)
    const row = rows.find((x) => x.name === name)
    if (!row) return
    const inc = inside.get(row.u)
    if (inc) {
      for (const x of rows)
        if (inc.from.includes(x.u)) {
          const tr = rowElement(x.name)
          if (tr) flash(tr, 'flash')
        }
      return notify(`${name}已经含在${quoteAll(inc.from.map((u) => u.leader))}里，跟着一起做`)
    }
    const selected = new Set(tops)
    if (selected.has(row.u)) selected.delete(row.u)
    else selected.add(row.u)
    state.pick = rows.filter((x) => selected.has(x.u)).map((x) => x.name)
    const after = pickOf(res)
    state.pick = rows.filter((x) => after.tops.has(x.u)).map((x) => x.name)
    save()
    redraw()
  }
  useLayoutEffect(() => {
    const picks = pickOf(res)
    const body = element('body')
    for (const btn of document.querySelectorAll('[data-act="blueprint"], [data-act="beltless"]'))
      btn.setAttribute('aria-disabled', String(!picks.tops.size))
    element('pick-hint').textContent = pickHint(picks)
    let current: Element | null | undefined
    const light = (tr: Element | null) => {
      if (tr === current) return
      current = tr
      body.querySelectorAll('tr.hl').forEach((x) => x.classList.remove('hl'))
      const row = picks.rows.find((x) => x.name === tr?.getAttribute('data-item'))
      if (!row) return
      const inc = picks.inside.get(row.u)
      for (const x of picks.rows) {
        const mate = picks.tops.has(row.u)
          ? picks.inside.get(x.u)?.from.includes(row.u)
          : inc?.from.includes(x.u)
        if (mate) rowElement(x.name)?.classList.add('hl')
      }
    }
    const over = (e: PointerEvent) =>
      light(e.target instanceof Element ? e.target.closest('tr[data-item]') : null)
    const leave = () => light(null)
    body.addEventListener('pointerover', over)
    body.addEventListener('pointerleave', leave)
    light(body.querySelector('tr[data-item]:hover'))
    return () => {
      body.removeEventListener('pointerover', over)
      body.removeEventListener('pointerleave', leave)
    }
  }, [res, version])
  return selectItem
}

export function nudgePick(res: Result, notify: Notice) {
  if (!res.goals.length) return notify('先选一个目标，再生成蓝图')
  const list = document.querySelector<HTMLElement>('.list')
  if (!list || !pickOf(res).rows.length)
    return notify(
      !element('sheet-done').hidden && active
        ? '这一页都做完了，点生产清单右边的「归档」并进总页面'
        : '这一页没有要自己做的东西了',
    )
  for (const e of [list, element('pick-hint')]) flash(e, 'nudge')
  const r = list.getBoundingClientRect()
  if (r.top > innerHeight - 160 || r.bottom < 160)
    list.scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
}
