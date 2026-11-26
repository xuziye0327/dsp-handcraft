import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { ICONS } from './atlas'
import { element, type Commit } from './display'
import { autoPick, PRODUCERS, RARE, RARE_ALT, state, type Result } from './model'
import { Icon, ItemBox, Cross } from './ui'

export function Targets({
  res,
  commit,
  open,
  update,
}: {
  res: Result
  commit: Commit
  open: (index: number) => void
  update: () => void
}) {
  const inUse = (name: string) => res.src.has(name) && !res.src.get(name)
  const rares = RARE.filter(
    (rare) =>
      inUse(rare) ||
      [...res.src].some(
        ([name, r]) =>
          r &&
          (name === rare ||
            (state.recipe[name] === undefined &&
              RARE_ALT.get(name)?.some(([mineral, alt]) => mineral === rare && alt !== r))),
      ),
  )
  useLayoutEffect(() => {
    element('rare-box').hidden = !rares.length
  }, [rares.length])
  return (
    <>
      {createPortal(
        state.goals.map((g, i) => (
          <li className="goal" key={`${i}:${g.name}`}>
            <button
              className="target-btn"
              type="button"
              data-act="pick"
              data-i={i}
              title={`${g.name}（点击换一种）`}
              onClick={() => open(i)}
            >
              <ItemBox name={g.name} />
              <span className="pick-name">{g.name}</span>
            </button>
            <label className="rate">
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={g.rate || ''}
                data-i={i}
                aria-label={`${g.name}每分钟产量`}
                onChange={(e) => {
                  const v = e.currentTarget.valueAsNumber
                  g.rate = Number.isFinite(v) && v > 0 ? v : 0
                  update()
                }}
              />
              <span aria-hidden="true">/分</span>
            </label>
            <button
              className="rm"
              type="button"
              data-act="rm-goal"
              data-i={i}
              aria-label={`移除${g.name}`}
              onClick={() => commit(() => state.goals.splice(i, 1))}
            >
              <Cross />
            </button>
          </li>
        )),
        element('goals'),
      )}
      {createPortal(
        rares.map((n) => (
          <li key={n}>
            <button
              className={`rare${inUse(n) ? ' on' : ''}`}
              type="button"
              data-act="rare"
              data-item={n}
              aria-pressed={inUse(n)}
              title={
                inUse(n) ? '这个星球没有：用它的配方换成别的' : '这个星球有：用得上它的配方都换过去'
              }
              onClick={() =>
                commit(() => {
                  state.rare[n] = !inUse(n)
                })
              }
            >
              <Icon name={n} cls="s18" />
              {n}
            </button>
          </li>
        )),
        element('rare'),
      )}
      {createPortal(
        Object.entries(state.recipe)
          .filter(([, v]) => v === 'ext' || v === 'raw')
          .map(([n]) => (
            <li className="chip" key={n}>
              <Icon name={n} cls="s18" />
              {n}
              <button
                type="button"
                data-act="ext-rm"
                data-item={n}
                title="改回自己生产"
                aria-label={`${n}改回自己生产`}
                onClick={() => commit(() => delete state.recipe[n])}
              >
                <Cross />
              </button>
            </li>
          )),
        element('ext'),
      )}
    </>
  )
}

export function Picker({
  index,
  close,
  commit,
}: {
  index: number
  close: () => void
  commit: Commit
}) {
  const dialog = element<HTMLDialogElement>('picker')
  const cur = state.goals[index]?.name
  const [tab, setTab] = useState(ICONS.find(([n]) => n === cur)?.[1] === 2 ? 2 : 1)
  const [query, setQuery] = useState('')
  useLayoutEffect(() => {
    const backdrop = (e: MouseEvent) => {
      if (e.target === dialog) dialog.close()
    }
    dialog.addEventListener('close', close)
    dialog.addEventListener('click', backdrop)
    dialog.showModal()
    return () => {
      dialog.removeEventListener('close', close)
      dialog.removeEventListener('click', backdrop)
      if (dialog.open) dialog.close()
    }
  }, [close, dialog])
  function pick(name: string) {
    dialog.close()
    commit(() => {
      const goal = state.goals[index]
      if (goal) goal.name = name
      else state.goals.push({ name, rate: 60 })
      autoPick()
    })
  }
  const tile = (name: string) => {
    const raw = !PRODUCERS.get(name)?.some((r) => !r.source)
    return (
      <button
        key={name}
        className={`tile${name === cur ? ' is-goal' : ''}${raw ? ' is-raw' : ''}`}
        type="button"
        data-pick={name}
        title={raw ? '原料，直接开采' : undefined}
        onClick={() => pick(name)}
      >
        <Icon name={name} cls="s36" />
        <span className="nm">{name}</span>
      </button>
    )
  }
  const q = query.trim().toLowerCase()
  const entries = ICONS.filter((x) => x[1] === tab && x[2] > 0)
  const layout = new Map(entries.map(([name, , row, col]) => [(row - 1) * 14 + col - 1, name]))
  const slots = q
    ? ICONS.filter(
        ([n]) =>
          PRODUCERS.has(n) &&
          (n.toLowerCase().includes(q) || window.dsphcTr?.(n).toLowerCase().includes(q)),
      ).map(([n]) => tile(n))
    : Array.from({ length: Math.max(0, ...entries.map(([, , r]) => r)) * 14 }, (_, i) => {
        const name = layout.get(i)
        return name ? tile(name) : <span className="slot" key={`slot-${i}`} />
      })
  return createPortal(
    <div className="dlg">
      <div className="dlg-head">
        <h2 id="picker-title">{cur ? '更换目标产物' : '添加目标产物'}</h2>
        <fieldset className="toggle" id="tabs" aria-label="分类" style={{ border: 0, margin: 0 }}>
          {[1, 2].map((t) => (
            <button
              key={t}
              type="button"
              data-tab={t}
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t)
                setQuery('')
              }}
            >
              {t === 1 ? '物品' : '建筑'}
            </button>
          ))}
        </fieldset>
        <label className="find-wrap">
          <i className="ico i-search" />
          <input
            className="find"
            id="find"
            type="search"
            placeholder="搜索物品"
            autoComplete="off"
            aria-label="搜索物品"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
        </label>
        <button
          className="close"
          type="button"
          data-act="close-picker"
          aria-label="关闭"
          onClick={() => dialog.close()}
        >
          <Cross />
        </button>
      </div>
      <div className="slots" id="slots">
        {slots.length ? slots : <p className="pick-none">没找到</p>}
      </div>
    </div>,
    dialog,
  )
}
