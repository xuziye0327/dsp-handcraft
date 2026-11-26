import { useLayoutEffect, type CSSProperties, type ReactNode } from 'react'

import type { SupplyChain, NamedItem, SupplyAppearance, Unit } from './supply-types'

const RAW_LIKE = [1117, 1120, 1121, 1116]
export const FRAC_RECIPE = 115
interface Use {
  item: number
  name: string
  recipe: number
  recipeName: string
  line: string
  on: boolean
}
export interface RecipeGroup {
  key: string
  ore: NamedItem | null
  icon: NamedItem | null
  name: string
  line: string
  uses: Use[]
}
function recipeGroups(d: SupplyChain) {
  const goals = new Set(d.goals.map((g) => g.id))
  const groups = new Map<string, RecipeGroup>()
  for (const x of d.recipes)
    for (const a of x.alts) {
      if (a.id === FRAC_RECIPE && !goals.has(x.id)) continue
      if (a.ore && !a.main) continue
      const key = a.ore ? `ore${a.ore.id}` : `r${a.id}`
      const group = groups.get(key) ?? {
        key,
        ore: a.ore,
        icon: a.key,
        name: a.ore?.name ?? a.name,
        line: a.line,
        uses: [],
      }
      group.uses.push({
        item: x.id,
        name: x.name,
        recipe: a.id,
        recipeName: a.name,
        line: a.line,
        on: x.chosen === a.id,
      })
      groups.set(key, group)
    }
  return [...groups.values()]
}
interface CardProps {
  ui: SupplyAppearance
  on: boolean
  title: string
  item: NamedItem | null
  name: string
  children: ReactNode
  onClick: () => void
  'data-ext'?: string
  'data-uses'?: string
  'data-rare'?: string
}
function RecipeCard({ ui, on, title, item, name, children, onClick, ...data }: CardProps) {
  const it = item && (ui.getItem(item.id) ?? item)
  const color = item && ui.getItem(item.id)?.type
  return (
    <button
      type="button"
      className={'rc' + (on ? ' is-on' : '')}
      style={{ '--cat': color ? ui.categoryColor(color) : undefined } as CSSProperties}
      aria-pressed={on}
      title={title}
      onClick={onClick}
      {...data}
    >
      <span className="rc-ico" dangerouslySetInnerHTML={{ __html: it ? ui.pic(it) : '' }} />
      <span className="rc-name">{name}</span>
      <span className="rc-state">{on ? '已开启' : ''}</span>
      {children}
    </button>
  )
}
interface PickerProps {
  data: SupplyChain
  ui: SupplyAppearance
  setVisible: (visible: boolean) => void
  toggleRaw: (unit: Unit) => void
  toggleGroup: (group: RecipeGroup, on: boolean) => void
}
export function RecipePicker({ data: d, ui, setVisible, toggleRaw, toggleGroup }: PickerProps) {
  const groups = recipeGroups(d),
    ores = groups.filter((g) => g.ore),
    recipes = groups.filter((g) => !g.ore)
  const raws = RAW_LIKE.map((id) =>
    d.units.find((u) => u.id === id && u.state !== 'dropped'),
  ).filter((u): u is Unit => !!u)
  const names = new Map([...d.goals, ...d.units].map((u) => [u.id, u.name]))
  const users = (ids: number[]) => (
    <span className="rc-for">
      {ids.length
        ? `用于 ${[...new Set(ids)].map((id) => names.get(id) ?? ui.getItem(id)?.name ?? '').join('、')}`
        : ''}
    </span>
  )
  const groupCard = (g: RecipeGroup) => {
    const on = g.uses.every((u) => u.on)
    const what = g.uses.map((u) => `${u.name}改用「${u.recipeName}」（${u.line}）`).join('；')
    return (
      <RecipeCard
        key={g.key}
        ui={ui}
        on={on}
        title={`${g.ore ? `${g.name}：` : ''}${what}。点击${on ? '改回默认配方' : '开启'}`}
        item={g.icon}
        name={g.name}
        data-uses={g.uses.map((u) => `${u.item}:${u.recipe}`).join(',')}
        data-rare={g.ore ? '' : undefined}
        onClick={() => toggleGroup(g, on)}
      >
        {g.ore ? users(g.uses.map((u) => u.item)) : <span className="rc-line">{g.line}</span>}
      </RecipeCard>
    )
  }
  const rawCard = (u: Unit) => {
    const on = u.state === 'external'
    const uses = d.edges.filter((e) => e.from === u.id && e.state !== 'dropped').map((e) => e.to)
    const used = uses.length ? `，用于 ${uses.map((id) => names.get(id)).join('、')}` : ''
    return (
      <RecipeCard
        key={u.id}
        ui={ui}
        on={on}
        item={u}
        name={u.name}
        data-ext={u.name}
        onClick={() => toggleRaw(u)}
        title={`${u.name}：${on ? '当原矿，由外部供给' : '现在在产线里做'}${used}。点击${on ? '改回在产线里做' : '当原矿，由外部供给'}`}
      >
        {users(uses)}
      </RecipeCard>
    )
  }
  const hidden = !raws.length && !groups.length
  useLayoutEffect(() => {
    setVisible(!hidden)
    return () => setVisible(false)
  }, [setVisible, hidden])
  return (
    <>
      {ores.length + raws.length > 0 && (
        <>
          <h3>珍奇和原矿</h3>
          <div className="rc-list">
            {ores.map(groupCard)}
            {raws.map(rawCard)}
          </div>
        </>
      )}
      {recipes.length > 0 && (
        <>
          <h3>新配方</h3>
          <div className="rc-list">{recipes.map(groupCard)}</div>
        </>
      )}
    </>
  )
}
