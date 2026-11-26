import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { type Commit, shown } from './display'
import { BELTS, BY_KEY, MACHINES, PICKABLE, SPRAY, state } from './model'
import { Icon } from './ui'

interface Option {
  value: string
  label: ReactNode
  selected: boolean
  note?: string
  header?: string
  change: () => void
}
function Pill({
  face,
  options,
  act,
  open,
  toggle,
  close,
  commit,
}: {
  face: ReactNode
  options: Option[]
  act: string
  open: boolean
  toggle: () => void
  close: () => void
  commit: Commit
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [shut, setShut] = useState(false)
  useLayoutEffect(() => {
    function fit() {
      const w = wrap.current,
        m = menu.current
      if (!w || !m) return
      w.classList.remove('flip')
      m.style.cssText = 'display:block;visibility:hidden'
      w.classList.toggle(
        'flip',
        m.getBoundingClientRect().right > document.documentElement.clientWidth - 8,
      )
      m.style.cssText = ''
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [face, open, shut])
  return (
    <div
      ref={wrap}
      className={`pill-wrap${open ? ' open' : ''}${shut ? ' shut' : ''}`}
      onMouseLeave={() => setShut(false)}
    >
      <button
        className="pill"
        type="button"
        aria-haspopup="menu"
        onClick={() => {
          setShut(false)
          toggle()
        }}
      >
        {face}
      </button>
      <div className="pill-menu" ref={menu} role="menu">
        {options.map((o) => (
          <Fragment key={o.value}>
            {o.header && <div className="menu-head">{o.header}</div>}
            <button
              className="menu-item"
              type="button"
              role="menuitemradio"
              aria-checked={o.selected}
              data-act={act}
              data-v={o.value}
              onClick={() => {
                close()
                setShut(true)
                commit(o.change)
              }}
            >
              {o.label}
              {o.note && <span className="menu-note">{o.note}</span>}
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
const label = (name: string, text = shown(name)) => (
  <>
    <Icon name={name} cls="s18" />
    {text}
  </>
)
export function Toolbar({ commit }: { commit: Commit }) {
  const [opened, setOpened] = useState('')
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (!(e.target instanceof Element && e.target.closest('.pill-wrap'))) setOpened('')
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpened('')
    }
    document.addEventListener('click', click)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('click', click)
      document.removeEventListener('keydown', esc)
    }
  }, [])
  const pill = (id: string, act: string, face: ReactNode, options: Option[]) => (
    <Pill
      key={id}
      act={act}
      open={opened === id}
      toggle={() => setOpened(opened === id ? '' : id)}
      close={() => setOpened('')}
      {...{ commit, face, options }}
    />
  )
  const belt = BELTS[state.belt]!
  const sp = SPRAY[state.spray.level]
  const sprays: Option[] = [
    {
      value: '0',
      selected: !sp,
      label: '不喷增产剂',
      change: () => {
        state.spray.level = 0
      },
    },
  ]
  for (const mode of ['speed', 'extra'] as const) {
    SPRAY.forEach((s, level) => {
      if (!s) return
      const speed = mode === 'speed'
      sprays.push({
        value: `${level}|${mode}`,
        selected: state.spray.level === level && state.spray.mode === mode,
        header:
          level === 1
            ? speed
              ? '加速：设备做得更快，原料不变'
              : '增产：同样的原料多出产物（只能加速的配方照样加速）'
            : undefined,
        label: label(s.name, `${s.short} ${speed ? '加速' : '增产'}`),
        note: `${speed ? '快' : '多'} ${100 * s[mode]}%`,
        change: () => {
          state.spray = { level, mode }
        },
      })
    })
  }
  return (
    <>
      {pill(
        'belt',
        'belt',
        label(belt[0]),
        BELTS.map(([n, rate], i) => ({
          value: String(i),
          selected: i === state.belt,
          label: label(n),
          note: `${rate}/分`,
          change: () => {
            state.belt = i
          },
        })),
      )}
      {PICKABLE.map((kind) =>
        pill(
          kind,
          'kind',
          label(state.kind[kind]!),
          MACHINES[kind]!.map(([n, s]) => ({
            value: `${kind}|${n}`,
            selected: n === state.kind[kind],
            label: label(n),
            note: `速度 ×${s}`,
            change: () => {
              state.kind[kind] = n
              for (const [k, v] of Object.entries(state.machineOf))
                if (v === n && BY_KEY.get(k)?.kind === kind) delete state.machineOf[k]
            },
          })),
        ),
      )}
      {pill(
        'spray-all',
        'spray-all',
        sp ? (
          label(sp.name, `${sp.short} ${state.spray.mode === 'extra' ? '增产' : '加速'}`)
        ) : (
          <>
            <Icon name="增产剂Mk.Ⅰ" cls="s18 off" />
            <span className="pill-key">不喷增产剂</span>
          </>
        ),
        sprays,
      )}
    </>
  )
}
