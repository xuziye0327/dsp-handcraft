import { useRef, useState, type CSSProperties } from 'react'

import type { Settings } from './settings'
import { categoryColors, type CatalogItem, type ItemIcon, type Forecast } from './shared'
const statusText = {
  ok: '只用熔炉、制造台和化工厂就能做',
  partial: '产线里有原油精炼厂等，选中后会请你把相关中间产物设为外部供应',
  self: '本身需要原油精炼厂等暂不支持的工厂，不能作为目标',
  none: '没有常规的单产物配方，不能作为目标',
  raw: '原矿，不能作为目标',
}
interface TargetProps {
  state: Settings
  catalog: CatalogItem[]
  items: Map<number, CatalogItem>
  pic: (item: ItemIcon) => string
  setRate: (index: number, rate: number) => void
  remove: (index: number) => void
  changePage: (page: number) => void
  resetRecipe: (id: number) => void
  forecast: Forecast | null
  editSupply: () => void
  afterPick: (id: number, replace: number | null) => void
  removeSupply: (name: string) => void
}
function Icon({ item, pic }: { item?: CatalogItem; pic: TargetProps['pic'] }) {
  return item ? (
    <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: pic(item) }} />
  ) : null
}
function SupplyChips({
  state,
  catalog,
  items,
  forecast,
  pic,
  resetRecipe,
  removeSupply,
}: TargetProps) {
  if (!forecast && catalog.length && state.targets.every((t) => items.has(t.id))) return null
  const chain = forecast?.chainItems && new Set(forecast.chainItems),
    supplies = forecast?.supplied && new Set(forecast.supplied)
  const autoExt = state.rareOff.includes(1117) ? [] : (forecast?.autoExt ?? [])
  const ext = [...new Set([...state.ext, ...autoExt])]
    .map((name) => ({ name, item: catalog.find((c) => c.name === name) }))
    .filter(
      ({ name, item }) =>
        (!chain || (!!item && chain.has(item.id))) && (!supplies || supplies.has(name)),
    )
  const autoRecipes = forecast?.autoRecipes?.filter((id) => !state.rareOff.includes(id)) ?? []
  const alts = [...new Set([...Object.keys(state.recipes).map(Number), ...autoRecipes])]
    .filter((id) => !chain || chain.has(id))
    .map((id) => items.get(id))
    .filter((x): x is CatalogItem => !!x)
  if (!ext.length && !alts.length) return <li className="none">无</li>
  return (
    <>
      {ext.map(({ name, item }) => (
        <li key={name}>
          <Icon pic={pic} item={item} />
          {name}
          <button
            type="button"
            data-ext={name}
            aria-label={`移除外部供应 ${name}`}
            onClick={() => removeSupply(name)}
          >
            ×
          </button>
        </li>
      ))}
      {alts.map((it) => (
        <li key={it.id} className="rc-on">
          <Icon pic={pic} item={it} />
          {`${it.name}：新配方`}
          <button
            type="button"
            data-recipe-off={it.id}
            aria-label={`${it.name} 改回默认配方`}
            onClick={() => resetRecipe(it.id)}
          >
            ×
          </button>
        </li>
      ))}
    </>
  )
}
export function Targets(props: TargetProps) {
  const { state, catalog, items, pic, afterPick } = props
  const dialog = useRef<HTMLDialogElement>(null),
    find = useRef<HTMLInputElement>(null)
  const [replace, setReplace] = useState<number | null>(null),
    [query, setQuery] = useState(''),
    [message, setMessage] = useState('')
  const open = (i: number | null) => {
    setReplace(i)
    setMessage('')
    dialog.current!.showModal()
    find.current?.focus()
  }
  const pick = (it: CatalogItem) => {
    if (it.status !== 'ok' && it.status !== 'partial') {
      setMessage(`${it.name}：${statusText[it.status]}。`)
      return
    }
    setMessage('')
    dialog.current?.close()
    afterPick(it.id, replace)
  }
  const page = catalog.filter((x) => x.page === state.page),
    at = new Map(page.map((x) => [14 * (x.row - 1) + x.col - 1, x])),
    q = query.trim().toLowerCase()
  return (
    <>
      <div className="field">
        <span className="field-label" id="goal-label">
          目标产物
        </span>
        <ul className="goals" id="goals" aria-labelledby="goal-label">
          {state.targets.map((t, i) => {
            const it = items.get(t.id),
              name = it?.name ?? '还没选'
            return (
              <li className="goal" key={t.id}>
                <button
                  type="button"
                  className="target-btn"
                  data-i={i}
                  aria-haspopup="dialog"
                  aria-label={`更换目标 ${name}`}
                  title="点一下换目标"
                  onClick={() => open(i)}
                >
                  <span className="ibox">
                    <Icon pic={pic} item={it} />
                  </span>
                  <span className="pick-name">{name}</span>
                </button>
                <label className="rate">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    data-i={i}
                    value={t.rate || ''}
                    aria-label={`${name} 每分钟产量`}
                    onChange={(e) => props.setRate(i, Number(e.target.value))}
                  />
                  <span>/分</span>
                </label>
                <button
                  type="button"
                  className="rm"
                  data-i={i}
                  aria-label={`移除目标 ${name}`}
                  hidden={state.targets.length < 2}
                  onClick={() => props.remove(i)}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          className="add-goal"
          id="goal-add"
          aria-haspopup="dialog"
          onClick={() => open(null)}
        >
          <i className="ico i-plus" aria-hidden="true" />
          添加目标
        </button>
      </div>
      <div className="field">
        <span className="field-label" id="ext-label">
          外部供应
        </span>
        <div className="ext-row">
          <ul className="chips" id="ext-list" aria-labelledby="ext-label">
            <SupplyChips {...props} />
          </ul>
          <button
            type="button"
            className="linkish"
            id="ext-edit"
            aria-haspopup="dialog"
            onClick={props.editSupply}
          >
            调整
          </button>
        </div>
      </div>
      <dialog
        id="pick-dialog"
        ref={dialog}
        aria-labelledby="pick-title"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target === find.current) e.preventDefault()
        }}
      >
        <div className="dlg">
          <div className="dlg-head">
            <h2 id="pick-title">{replace === null ? '添加目标产物' : '更换目标产物'}</h2>
            <fieldset className="toggle" aria-label="物品页">
              {[1, 2].map((p) => (
                <button
                  type="button"
                  key={p}
                  data-page={p}
                  aria-pressed={p === state.page}
                  onClick={() => props.changePage(p)}
                >
                  {p === 1 ? '物品' : '建筑'}
                </button>
              ))}
            </fieldset>
            <input
              ref={find}
              className="find"
              id="find"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索物品"
              aria-label="搜索物品"
              autoComplete="off"
            />
            <button
              type="button"
              className="close"
              data-close=""
              aria-label="关闭"
              title="关闭"
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
          </div>
          <div className="slots" id="slots" role="grid" aria-label="物品">
            {page.length ? (
              Array.from({ length: Math.max(...page.map((it) => it.row)) * 14 }, (_, i) => {
                const it = at.get(i)
                if (!it) return <div key={i} className="slot" aria-hidden="true" />
                const off = it.status !== 'ok' && it.status !== 'partial',
                  hit = it.name.toLowerCase().includes(q),
                  tip = `${it.name}：${statusText[it.status]}`
                return (
                  <button
                    key={i}
                    type="button"
                    data-id={it.id}
                    className={[
                      'tile',
                      `st-${it.status}`,
                      state.targets.some((t) => t.id === it.id) ? 'is-target' : '',
                      off ? 'is-off' : '',
                      q ? (hit ? 'is-hit' : 'is-dim') : '',
                    ].join(' ')}
                    style={
                      { '--cat': categoryColors[it.type ?? 1] ?? categoryColors[1] } as CSSProperties
                    }
                    title={tip}
                    aria-label={tip}
                    aria-disabled={off || undefined}
                    onClick={() => pick(it)}
                  >
                    <Icon pic={pic} item={it} />
                    <span className="nm">{it.name}</span>
                  </button>
                )
              })
            ) : (
              <p className="hint">物品列表加载中…</p>
            )}
          </div>
          <output className="pick-msg" id="pick-msg" aria-live="polite">
            {message}
          </output>
          <p className="cat-key">
            <span>
              <i className="k-target" />
              当前目标
            </span>
            <span>
              <i className="k-partial" />
              要把部分中间产物设为外部供应
            </span>
            <span>
              <i className="k-off" />
              不能作为目标
            </span>
          </p>
        </div>
      </dialog>
    </>
  )
}
