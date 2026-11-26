import type { Notice } from './display'
import { active, BASE, save, setActive, state, tabs, type Tab } from './model'

/** Archiving merges goals and the completed ledger but keeps the main page's equipment choices. */
export function archiveTab(index: number, update: () => void, notify: Notice) {
  const gone = tabs[index]
  if (index < 1 || !gone) return
  save()
  const total = tabs[0]!.state
  const before = structuredClone(total.goals)
  const builtBefore = [...total.built]
  tabs.splice(index, 1)
  for (const goal of gone.state.goals) {
    if (!goal.name || !(goal.rate > 0)) continue
    const same = total.goals.find((g) => g.name === goal.name)
    if (same) same.rate += goal.rate
    else total.goals.push({ ...goal })
  }
  total.built.push(...structuredClone(gone.state.built))
  setActive(0)
  update()
  notify(`「${gone.name}」已归档，目标并进总页面`, () => {
    save()
    tabs[0]!.state.goals = before
    tabs[0]!.state.built = builtBefore
    restoreTab(gone, index, update)
  })
}
function restoreTab(tab: Tab, index: number, update: () => void) {
  const at = Math.min(index, tabs.length)
  tabs.splice(at, 0, tab)
  setActive(at)
  update()
}
const newId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
export function addPage(update: () => void) {
  save()
  const n = 1 + Math.max(0, ...tabs.map((t) => Number(/^页面 (\d+)$/.exec(t.name)?.[1] || 0)))
  const s = structuredClone(BASE)
  s.goals = []
  s.kind = { ...state.kind }
  s.spray = { ...state.spray }
  s.belt = state.belt
  tabs.push({ id: newId(), name: `页面 ${n}`, state: s })
  setActive(tabs.length - 1)
  update()
}
export function copyPage(i: number, update: () => void) {
  const tab = tabs[i]!
  save()
  tabs.splice(i + 1, 0, { id: newId(), name: `${tab.name} 副本`, state: structuredClone(tab.state) })
  setActive(i + 1)
  update()
}
export function closePage(i: number, update: () => void, notify: Notice) {
  if (i < 1) return
  save()
  const tab = tabs.splice(i, 1)[0]!
  setActive(active >= i ? active - 1 : active)
  update()
  notify(`已删除「${tab.name}」`, () => {
    save()
    restoreTab(tab, i, update)
  })
}
