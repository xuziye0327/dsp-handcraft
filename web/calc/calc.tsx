// DSQ 量产量化计算器（github.com/122474363/DSQ，GPL-3.0）。游戏配方在独立加载的 dsq-data.js 中。
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { ICON_AT, ICON_COLS } from './atlas'
import { element, quoteAll, type Commit, type Notice } from './display'
import {
  builtOf,
  generatorSession,
  migrateDone,
  readDone,
  selectedPlan,
  type Done,
  type GeneratorSession,
} from './handoff'
import {
  active,
  autoPick,
  BY_KEY,
  cleanBuilt,
  loadData,
  mode,
  pickOf,
  PRODUCERS,
  save,
  setCalcMode,
  setState,
  solve,
  state,
  tabs,
  type Result,
  type Tab,
} from './model'
import { archiveTab } from './page-actions'
import { Pages } from './Pages'
import { nudgePick, useSelection } from './selection'
import { Sheet, type SheetActions } from './Sheet'
import { bindShell } from './shell'
import { Picker, Targets } from './Targets'
import { Toolbar } from './Toolbar'

interface Toast {
  text: string
  undo?: () => void
  ms: number
}
interface Generator extends GeneratorSession {
  tab: Tab
  res: Result
}

function GeneratorFrame({
  session,
  close,
}: {
  session: Generator
  close: (done: Done | null) => void
}) {
  const frame = useRef<HTMLIFrameElement>(null),
    latest = useRef<Done | null>(null)
  useLayoutEffect(() => {
    document.body.style.overflow = 'hidden'
    const message = (e: MessageEvent<unknown>) => {
      if (!frame.current || (e.source !== frame.current.contentWindow && e.source !== window)) return
      if (e.data === 'dsphc-close') close(latest.current)
      else {
        const done = readDone(e.data)
        if (done) latest.current = done
      }
    }
    window.addEventListener('message', message)
    return () => {
      window.removeEventListener('message', message)
      document.body.style.overflow = ''
    }
  }, [close])
  return (
    <div id="bp-box">
      <iframe title="手搓产线蓝图" allow="clipboard-write" ref={frame} src={session.src} />
    </div>
  )
}

export function Calculator({ initial }: { initial: Result }) {
  const [res, setResult] = useState(initial)
  const [picker, setPicker] = useState<number | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [generator, setGenerator] = useState<Generator | null>(null)
  const closePicker = useCallback(() => setPicker(null), [])
  const notify: Notice = useCallback(
    (text, undo, ms) => setToast({ text, undo, ms: ms || (undo ? 6000 : 3600) }),
    [],
  )
  const update = useCallback(() => {
    save()
    setResult(solve())
  }, [])
  const commit: Commit = (change) => {
    const before = structuredClone(state)
    change()
    const next = solve()
    if (next.bad) {
      setState(before)
      save()
      setResult(solve())
      return notify('这样选，两种物品会互相当原料、越算越多，算不出来，已经改回去了')
    }
    save()
    setResult(next)
  }
  const selectItem = useSelection(res, notify)
  const changeBuilt = (tab: Tab, text: string, change: () => void) => {
    const before = structuredClone(tab.state)
    change()
    update()
    notify(text, () => {
      tab.state = before
      if (tabs[active] === tab) setState(before)
      update()
    })
  }
  const actions: SheetActions = {
    commit,
    selectItem,
    quickGoal(name) {
      commit(() => {
        state.goals = [{ name, rate: 60 }]
        autoPick()
      })
    },
    removeBuilt(i) {
      const b = state.built[i]
      if (b)
        changeBuilt(tabs[active]!, `删掉了${quoteAll(Object.keys(b.out))}的已完成记录`, () =>
          state.built.splice(i, 1),
        )
    },
  }
  function closeGenerator(done: Done | null) {
    setGenerator(null)
    if (!done || !generator || generator.tab !== tabs[active]) return
    const msg = done.kind === 'beltless' ? '无带蓝图已复制' : '蓝图生成好了'
    if (mode === 'demand') return notify(`${msg}；需求模式不记已完成`)
    const entry = builtOf(done, generator.res, generator.ext)
    if (entry)
      changeBuilt(generator.tab, `${msg}；${quoteAll(Object.keys(entry.out))}标成已完成`, () => {
        state.built.push(entry)
        state.pick = []
      })
  }
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), toast.ms)
    return () => window.clearTimeout(t)
  }, [toast])
  useLayoutEffect(() => {
    function generate(beltless: boolean) {
      if (!pickOf(res).tops.size) return nudgePick(res, notify)
      const plan = selectedPlan(res)
      if (!plan) return notify('选的这几样，别的配方顺带产出的就够用了，蓝图里没有要做的东西')
      setGenerator({ ...generatorSession(res, plan, beltless), tab: tabs[active]!, res })
    }
    const controller = new AbortController()
    const on = (selector: string, click: () => void) =>
      document
        .querySelector(selector)
        ?.addEventListener('click', click, { signal: controller.signal })
    on('[data-act="blueprint"]', () => generate(false))
    on('[data-act="beltless"]', () => generate(true))
    on('[data-act="add-goal"]', () => setPicker(state.goals.length))
    on('[data-act="archive"]', () => archiveTab(active, update, notify))
    for (const b of element('mode').querySelectorAll('button')) {
      const m = b.dataset.m
      b.setAttribute('aria-pressed', String(m === mode))
      b.addEventListener(
        'click',
        () => {
          if ((m !== 'demand' && m !== 'supply') || m === mode) return
          setCalcMode(m)
          update()
          notify(b.title, undefined, m === 'supply' ? 10000 : 0)
        },
        { signal: controller.signal },
      )
    }
    return () => controller.abort()
  }, [res, notify, update])
  return (
    <>
      <Sheet res={res} actions={actions} />
      <Targets res={res} commit={commit} open={setPicker} update={update} />
      {createPortal(<Toolbar key={tabs[active]!.id} commit={commit} />, element('toolbar'))}
      {createPortal(<Pages update={update} notify={notify} />, element('plans'))}
      {picker !== null && <Picker index={picker} close={closePicker} commit={commit} />}
      {createPortal(
        <>
          {generator && <GeneratorFrame session={generator} close={closeGenerator} />}
          {toast && (
            <output className="toast">
              {toast.text}
              {toast.undo && (
                <button
                  type="button"
                  onClick={() => {
                    setToast(null)
                    toast.undo?.()
                  }}
                >
                  撤销
                </button>
              )}
            </output>
          )}
        </>,
        element('calc-overlays'),
      )}
    </>
  )
}

function initialize() {
  loadData()
  for (const { state: s } of tabs) {
    s.goals = s.goals.filter((g) => PRODUCERS.has(g.name) || ICON_AT.has(g.name))
    for (const [n, v] of Object.entries(s.recipe))
      if (!PRODUCERS.has(n) || (!['raw', 'ext', 'done'].includes(v) && !BY_KEY.has(v)))
        delete s.recipe[n]
    s.pick = s.pick.filter((n) => PRODUCERS.has(n))
    s.built = s.built.map((b) => cleanBuilt(b, true)).filter((b) => Object.keys(b.out).length > 0)
    migrateDone(s)
  }
  save()
  return solve()
}
const root = createRoot(element('body'))
const script = document.currentScript
document.documentElement.style.setProperty('--cols', String(ICON_COLS))
bindShell()
try {
  const initial = initialize()
  flushSync(() => root.render(<Calculator initial={initial} />))
} catch (error) {
  root.render(
    <p className="loading">{`配方没载入成功（${error instanceof Error ? error.message : String(error)}），刷新一下试试。`}</p>,
  )
}
requestAnimationFrame(() =>
  requestAnimationFrame(() => document.documentElement.classList.remove('boot')),
)
if (window.dsphcLang === 'en') {
  const en = document.createElement('script')
  en.src = new URL(
    'calc-en.js',
    (script instanceof HTMLScriptElement && script.src) || location.href,
  ).href
  en.onerror = () => document.documentElement.classList.remove('i18n-wait')
  document.head.append(en)
}
