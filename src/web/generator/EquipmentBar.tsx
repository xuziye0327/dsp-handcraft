import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { groups, type OptionName } from './options'
import { pillIcons } from './pill-icons'
import { valueOf } from './settings'
import type { OptionProps } from './SettingsForm'
const names = [
  'power',
  'logistics',
  'belt',
  'sorter',
  'smelter',
  'assembler',
  'chemical',
  'lab',
  'spray',
] as const
type Pill = (typeof names)[number]
const subgroups: Partial<Record<Pill, { value: string; name: OptionName }>> = {
  sorter: { value: '2014', name: 'pilertech' },
  logistics: { value: 'station', name: 'pile' },
}
const items: Partial<Record<Pill, Record<string, number>>> = {
  power: { tesla: 2201, substation: 2212 },
  logistics: { box: 2101, station: 2104 },
  belt: { 1: 2001, 2: 2002, 3: 2003 },
  spray: { 1: 1141, 2: 1142, 3: 1143 },
}
function fitMenu(container: HTMLElement, sub: boolean) {
  const menu = container.querySelector<HTMLElement>(sub ? '.pill-submenu' : '.pill-menu')
  if (!menu) return
  menu.style.display = 'block'
  const rect = container.getBoundingClientRect()
  container.toggleAttribute(
    'data-flip',
    (sub ? rect.right : rect.left) + menu.offsetWidth > document.documentElement.clientWidth - 8,
  )
  if (sub)
    container.style.setProperty(
      '--sub-drop',
      `${Math.max(0, menu.offsetTop + menu.offsetHeight - container.offsetHeight)}px`,
    )
  menu.style.display = ''
}
const btn = (el: HTMLElement, selector: string) => el.querySelector<HTMLButtonElement>(selector)
export function EquipmentBar({
  state,
  choose,
  icon,
}: OptionProps & { icon: (id: number) => string | null }) {
  const [opened, setOpen] = useState<Pill | null>(null),
    [shut, setShut] = useState<Pill | null>(null),
    [subOpen, setSub] = useState(false)
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function outside(e: PointerEvent) {
      if (e.target instanceof Node && !bar.current?.contains(e.target)) {
        setOpen(null)
        setSub(false)
      }
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  const close = (wrap: HTMLElement, name: Pill, lock: boolean) => {
    setOpen(null)
    setSub(false)
    if (lock) {
      if (wrap.contains(document.activeElement)) btn(wrap, '.pill')?.focus({ preventScroll: true })
      setShut(name)
    }
  }
  const open = (wrap: HTMLElement, name: Pill, focus = false) => {
    fitMenu(wrap, false)
    setShut(null)
    setOpen(name)
    if (focus) requestAnimationFrame(() => btn(wrap, '[data-value][aria-checked="true"]')?.focus())
  }
  const openSub = (el: HTMLElement, focus = false) => {
    fitMenu(el, true)
    setSub(true)
    if (focus) requestAnimationFrame(() => btn(el, '[data-sub-value][aria-checked="true"]')?.focus())
  }
  const pick = (wrap: HTMLElement, name: Pill, value: string) => {
    close(wrap, name, true)
    choose(name, value)
  }
  function key(e: KeyboardEvent<HTMLButtonElement>, name: Pill) {
    const el = e.currentTarget,
      wrap = el.closest<HTMLElement>('.pill-wrap')!,
      sub = el.closest<HTMLElement>('.pill-sub'),
      isLevel = el.hasAttribute('data-sub-value'),
      isItem = el.hasAttribute('data-value')
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (isLevel && sub && (e.key === 'ArrowLeft' || e.key === 'Escape')) {
      setSub(false)
      btn(sub, '[data-value]')?.focus()
    } else if (e.key === 'Escape') {
      close(wrap, name, true)
    } else if (isItem && e.key === 'ArrowRight' && sub) {
      openSub(sub, true)
    } else if ((isLevel || isItem) && keys.includes(e.key)) {
      const buttons = Array.from(
        wrap.querySelectorAll<HTMLButtonElement>(isLevel ? '[data-sub-value]' : '[data-value]'),
      )
      const n = buttons.length,
        i = buttons.indexOf(el)
      buttons[
        e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (i + (e.key === 'ArrowUp' ? -1 : 1) + n) % n
      ]?.focus()
    } else if (el.matches('.pill') && ['Enter', ' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      open(wrap, name, true)
    } else if (el.matches('.pill') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      const buttons = Array.from(bar.current!.querySelectorAll<HTMLButtonElement>('.pill'))
      buttons[
        (buttons.indexOf(el) + (e.key === 'ArrowLeft' ? -1 : 1) + buttons.length) % buttons.length
      ]?.focus()
    } else return
    e.preventDefault()
  }
  return (
    <div className="toolbar" id="toolbar" ref={bar} role="toolbar" aria-label="设备与物流">
      {names.map((name) => {
        const field = groups[name],
          v = valueOf(state, name),
          selected = field.choices.find((c) => c.value === v)!,
          sub = subgroups[name]
        const off = (name === 'power' && !v) || (name === 'spray' && v === '0')
        const id = off ? (name === 'power' ? 2201 : 1141) : (items[name]?.[v] ?? Number(v))
        const image = id ? icon(id) : null
        const label = selected.pill ?? selected.text
        const ready = (wrap: HTMLElement) => {
          if (opened !== name) {
            setOpen(null)
            setSub(false)
          }
          setShut(null)
          fitMenu(wrap, false)
        }
        return (
          <div
            key={name}
            className={`pill-wrap${opened === name ? ' open' : ''}${shut === name ? ' shut' : ''}`}
            data-option={name}
            data-label={field.title}
            onPointerEnter={(e) => ready(e.currentTarget)}
            onFocus={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) ready(e.currentTarget)
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) close(e.currentTarget, name, false)
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse' && opened !== name) setSub(false)
            }}
          >
            <button
              type="button"
              className="pill"
              onKeyDown={(e) => key(e, name)}
              aria-haspopup="menu"
              aria-expanded={opened === name}
              aria-label={`${field.title}：${label}`}
              onClick={(e) => {
                const w = e.currentTarget.parentElement!
                if (opened === name) close(w, name, true)
                else open(w, name)
              }}
            >
              <span className="pill-ico" aria-hidden="true">
                {image ? (
                  <span
                    className={off ? 'pill-off' : undefined}
                    dangerouslySetInnerHTML={{ __html: image }}
                  />
                ) : (
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    dangerouslySetInnerHTML={{ __html: pillIcons[name] }}
                  />
                )}
              </span>
              <span className="pill-text">{label}</span>
            </button>
            <div className="pill-menu" role="menu" aria-label={field.title}>
              {field.choices.map((c) => {
                const hasSub = sub && sub.value === c.value
                const item = (
                  <button
                    key={c.value}
                    type="button"
                    role="menuitemradio"
                    tabIndex={-1}
                    data-value={c.value}
                    onKeyDown={(e) => key(e, name)}
                    aria-checked={c.value === v}
                    aria-haspopup={hasSub ? 'menu' : undefined}
                    aria-expanded={hasSub ? subOpen && opened === name : undefined}
                    onPointerOver={(e) => {
                      if (!hasSub && e.pointerType === 'mouse') setSub(false)
                    }}
                    onClick={(e) =>
                      pick(e.currentTarget.closest<HTMLElement>('.pill-wrap')!, name, c.value)
                    }
                  >
                    {c.pill ?? c.text}
                  </button>
                )
                if (!hasSub) return item
                return (
                  <div
                    key={c.value}
                    className={`pill-sub${opened === name && subOpen ? ' open' : ''}`}
                    data-sub={sub.name}
                    onPointerEnter={(e) => fitMenu(e.currentTarget, true)}
                  >
                    {item}
                    <button
                      type="button"
                      className="pill-sub-toggle"
                      tabIndex={-1}
                      aria-hidden="true"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        if (opened === name && subOpen) setSub(false)
                        else {
                          setOpen(name)
                          openSub(e.currentTarget.parentElement!)
                        }
                      }}
                    >
                      ▸
                    </button>
                    <div className="pill-submenu" role="menu" aria-label={groups[sub.name].title}>
                      <div className="pill-sub-head" role="presentation">
                        {groups[sub.name].title}
                      </div>
                      {groups[sub.name].choices.map((level) => (
                        <button
                          key={level.value}
                          type="button"
                          role="menuitemradio"
                          tabIndex={-1}
                          data-sub-value={level.value}
                          onKeyDown={(e) => key(e, name)}
                          aria-checked={valueOf(state, sub.name) === level.value}
                          onClick={(e) => {
                            choose(sub.name, level.value)
                            pick(e.currentTarget.closest<HTMLElement>('.pill-wrap')!, name, c.value)
                          }}
                        >
                          {level.text}
                          {level.note && <span className="pill-note">{level.note}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
