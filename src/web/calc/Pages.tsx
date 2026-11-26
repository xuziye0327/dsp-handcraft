import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { element, type Notice } from './display'
import { active, save, setActive, tabs, type Tab } from './model'
import { addPage, archiveTab, closePage, copyPage } from './page-actions'
import { Cross, Icon } from './ui'

function hintPlans() {
  const list = element('plans')
  list.classList.toggle('more', list.scrollLeft + list.clientWidth < list.scrollWidth - 1)
}
interface Context {
  tab: Tab
  anchor: HTMLElement
}
function PageMenu({
  ctx,
  close,
  choose,
}: {
  ctx: Context
  close: () => void
  choose: (act: string) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = box.current!
    const r = ctx.anchor.getBoundingClientRect()
    el.style.left = `${Math.max(8, Math.min(r.left, innerWidth - el.offsetWidth - 8))}px`
    el.style.top = `${r.bottom + 4 + el.offsetHeight > innerHeight - 8 ? Math.max(8, r.top - el.offsetHeight - 4) : r.bottom + 4}px`
    el.querySelector('button')?.focus({ preventScroll: true })
  }, [ctx])
  useEffect(() => {
    const outside = (e: Event) => {
      if (e.target instanceof Node && !box.current?.contains(e.target)) close()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        ctx.anchor.focus()
      }
    }
    document.addEventListener('click', outside)
    window.addEventListener('keydown', key)
    window.addEventListener('scroll', close)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('click', outside)
      window.removeEventListener('keydown', key)
      window.removeEventListener('scroll', close)
      window.removeEventListener('resize', close)
    }
  }, [ctx, close])
  const i = tabs.indexOf(ctx.tab)
  const btn = (act: string, text: string, note?: string) => (
    <button
      type="button"
      className="menu-item"
      role="menuitem"
      data-act={act}
      data-i={i}
      onClick={() => choose(act)}
    >
      {text}
      {note && <span className="menu-note">{note}</span>}
    </button>
  )
  return createPortal(
    <div ref={box} className="menu" role="menu">
      <div className="menu-head">{ctx.tab.name}</div>
      {btn('tab-rename', '重命名', '双击名字也行')}
      {btn('tab-copy', '复制这个页面')}
      {i > 0 && (
        <>
          {btn('tab-archive', '归档', '目标并进总页面')}
          {btn('tab-close', '删除这个页面', '不并进总页面')}
        </>
      )}
    </div>,
    element('calc-overlays'),
  )
}
function Rename({ name, finish }: { name: string; finish: (name?: string) => void }) {
  const was = name
  const [value, setValue] = useState(was)
  const input = useRef<HTMLInputElement>(null)
  const done = useRef(false)
  const end = (keep: boolean) => {
    if (done.current) return
    done.current = true
    const text = value.trim()
    finish(keep && text && text !== was ? text : undefined)
  }
  useLayoutEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])
  return (
    <input
      ref={input}
      aria-label="这个页面的名字"
      maxLength={24}
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.currentTarget.value)}
      onBlur={() => end(true)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter' || e.key === 'Escape') end(e.key === 'Enter')
      }}
    />
  )
}
export function Pages({ update, notify }: { update: () => void; notify: Notice }) {
  const [editing, edit] = useState<Tab | null>(null),
    [ctx, menu] = useState<Context | null>(null)
  const [drag, setDrag] = useState<Tab | null>(null),
    [over, setOver] = useState(false)
  const focus = useRef(false)
  function select(i: number) {
    if (i === active) return
    focus.current = !!document.activeElement?.closest('#plans')
    save()
    setActive(i)
    edit(null)
    menu(null)
    update()
  }
  function choose(act: string) {
    if (!ctx) return
    menu(null)
    const tab = ctx.tab,
      i = tabs.indexOf(tab)
    if (act === 'tab-rename') return edit(tab)
    if (act === 'tab-archive') return archiveTab(i, update, notify)
    if (act === 'tab-copy') copyPage(i, update)
    else if (act === 'tab-close') closePage(i, update, notify)
  }
  const list = element('plans')
  const activeId = tabs[active]?.id
  useLayoutEffect(hintPlans)
  useLayoutEffect(() => {
    const el = list.querySelector<HTMLElement>('[aria-selected="true"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    if (focus.current) {
      el?.focus()
      focus.current = false
    }
  }, [activeId, list])
  useEffect(() => {
    const btn = document.querySelector<HTMLButtonElement>('.plan-add')!
    const add = () => addPage(update)
    btn.addEventListener('click', add)
    list.addEventListener('scroll', hintPlans)
    window.addEventListener('resize', hintPlans)
    return () => {
      btn.removeEventListener('click', add)
      list.removeEventListener('scroll', hintPlans)
      window.removeEventListener('resize', hintPlans)
    }
  }, [update, list])
  return (
    <>
      {tabs.map((t, i) => {
        const goal = t.state.goals.find((g) => g.name)
        return (
          <div
            key={t.id}
            className={`plan${!i && drag ? ' drop-ready' : ''}${!i && over ? ' drop-on' : ''}`}
            role="tab"
            tabIndex={0}
            aria-selected={i === active}
            data-act="tab"
            data-i={i}
            draggable={i > 0 && editing !== t}
            title={`${t.name}（双击改名，右键更多${i ? '，拖到总页面上归档' : ''}）`}
            onClick={() => select(i)}
            onDoubleClick={(e) => {
              if (!(e.target instanceof Element && e.target.closest('button,input'))) edit(t)
            }}
            onContextMenu={(e) => {
              if (e.target instanceof HTMLInputElement) return
              e.preventDefault()
              menu({ tab: t, anchor: e.currentTarget })
            }}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return
              if (e.key === 'F2') {
                e.preventDefault()
                edit(t)
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                select(i)
              }
            }}
            onDragStart={(e) => {
              if (!i) return
              setDrag(t)
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', t.name)
            }}
            onDragOver={(e) => {
              if (!i && drag) {
                e.preventDefault()
                setOver(true)
                e.dataTransfer.dropEffect = 'move'
              }
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              if (!i && drag) {
                e.preventDefault()
                archiveTab(tabs.indexOf(drag), update, notify)
              }
              setOver(false)
              setDrag(null)
            }}
            onDragEnd={() => {
              setOver(false)
              setDrag(null)
            }}
          >
            {goal && <Icon name={goal.name} cls="s18" />}
            {editing === t ? (
              <Rename
                name={t.name}
                finish={(name) => {
                  if (name) t.name = name
                  edit(null)
                  save()
                }}
              />
            ) : (
              <span className="nm">{t.name}</span>
            )}
            {i > 0 && (
              <button
                type="button"
                className="x"
                data-act="tab-archive"
                data-i={i}
                tabIndex={-1}
                aria-label={`归档${t.name}`}
                title="归档：目标并进总页面"
                onClick={(e) => {
                  e.stopPropagation()
                  archiveTab(i, update, notify)
                }}
              >
                <Cross />
              </button>
            )}
          </div>
        )
      })}
      {ctx && <PageMenu ctx={ctx} close={() => menu(null)} choose={choose} />}
    </>
  )
}
