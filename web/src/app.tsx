import { useSyncExternalStore } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { sliceRoutes } from './drawing.js'
import { createIcons, outBlueprint, switchLanguage } from './generator/appearance'
import { createClipboard } from './generator/clipboard'
import { CopyButton, LikeButton } from './generator/ClipboardControls'
import { EquipmentBar } from './generator/EquipmentBar'
import { createFlat } from './generator/flat'
import { Generation, SupplyDialog } from './generator/Generation'
import { createGeneration } from './generator/job-state'
import type { OptionName } from './generator/options'
import { createPreview } from './generator/search-preview'
import { SearchPreview } from './generator/SearchPreview'
import {
  applyHandoff,
  buildParams,
  chooseOption,
  loadSettings,
  persist,
  type Handoff,
} from './generator/settings'
import { SettingsForm } from './generator/SettingsForm'
import {
  byId as $,
  fmt,
  categoryColors,
  signal,
  type CatalogItem,
  type Forecast,
} from './generator/shared'
import { createSheet, type SheetView, type PlanResult } from './generator/sheet'
import { createSupply } from './generator/supply'
import { Targets } from './generator/Targets'
import { createWorkerClient, type Response, type Result } from './generator/worker-client'
import { Workspace } from './generator/Workspace'
import { readHandoff } from './handoff.js'
import { startEnglish } from './i18n/index.js'
import { createViewer, type Viewer } from './viewer.js'

function mountGenerator() {
  const settings = loadSettings(),
    state = settings.state,
    handoff: Handoff | null = readHandoff(location.hash)
  if (handoff) {
    applyHandoff(state, handoff)
    history.replaceState(null, '', location.pathname + location.search)
  }
  const catalog: CatalogItem[] = [],
    items = new Map<number, CatalogItem>(),
    settingsChanged = signal()
  const icons = createIcons(items, catalog),
    presses = new Map<string, number>()
  const params = () => buildParams(state, handoff)
  let last: PlanResult | null = null,
    floors: ReturnType<typeof sliceRoutes> = [],
    forecast: Forecast | null = null
  let jobId = 0,
    catId = 0,
    forecastId = 0,
    forecastTimer: number | undefined
  const emptySelection = {
    level: 'all',
    focus: '',
    selected: '',
    factory: '',
    station: null,
    machine: null,
  } as const
  const view: SheetView = { ...emptySelection, buildings: true, sorters: true, power: false }
  const preview = createPreview(
    () => viewer,
    (round) => worker.send({ type: 'watch', id: jobId, round }),
  )
  const job = createGeneration(() => {
    preview.reset()
    clipboard.changed.update()
  })
  const clipboard = createClipboard({
    beltless: !!handoff?.beltless,
    busy: () => job.ui.busy,
    text: () =>
      flat.current?.placement.moved()
        ? flat.regenerate().then(outBlueprint)
        : $<HTMLTextAreaElement>('bp').value,
    error: (message) => job.setStatus(message, true),
    afterCopy() {
      if (flat.current)
        window.dispatchEvent(
          new CustomEvent('dsphc-done', {
            detail: {
              targets: flat.current.targets,
              ok: !flat.current.issues.length,
              kind: 'beltless',
            },
          }),
        )
    },
  })
  function requestForecast() {
    if (!catalog.length || !state.targets.every((t) => items.has(t.id))) return
    window.clearTimeout(forecastTimer)
    const id = ++forecastId
    forecastTimer = window.setTimeout(
      () => worker.send({ type: 'forecast', id, params: params() }),
      250,
    )
  }
  function save() {
    persist(state)
    settingsChanged.update()
    requestForecast()
  }
  function choose(k: OptionName, v: string) {
    chooseOption(state, k, v)
    save()
  }
  function submit() {
    if (job.ui.busy) return
    job.suggest('')
    if (!state.targets.every((t) => items.has(t.id))) {
      job.setStatus(
        catalog.length ? '先点左上角选一个目标产物。' : '物品列表还在加载，稍等一秒再点。',
        true,
      )
      return
    }
    const bad = state.targets.findIndex((t) => !(t.rate > 0))
    if (bad >= 0) {
      job.setStatus('每分钟产量需要是正数。', true)
      document.querySelector<HTMLInputElement>(`#goals input[data-i="${bad}"]`)?.focus()
      return
    }
    save()
    if (handoff?.beltless) {
      flat.generate()
      return
    }
    const p = params(),
      key = JSON.stringify(p),
      again = presses.get(key) ?? 0
    presses.set(key, again + 1)
    job.setBusy(true)
    worker.send({ type: 'plan', id: ++jobId, params: { ...p, again } })
  }
  function cancel() {
    if (!job.ui.busy) return
    worker.send({ type: 'cancel', id: jobId++ })
    job.setBusy(false)
    job.setStatus('已取消本轮生成。')
  }
  function publish(text: string, meta: string) {
    $<HTMLTextAreaElement>('bp').value = text
    $('bp-meta').textContent = meta
  }
  function finish(d: Result) {
    job.setBusy(false)
    if ('error' in d) {
      job.setStatus(d.error, true)
      if (!last && flat.current) flat.draw()
      job.suggest(d.suggestRaw ?? '')
      return
    }
    last = d
    flat.clear()
    clipboard.newResult()
    floors = sliceRoutes(d.model.routes)
    Object.assign(view, emptySelection)
    sheet.renderStation()
    viewer.reset()
    sheet.renderFloorNav(d)
    const secs = (d.ms / 1000).toFixed(1),
      ok = !!(d.feasible && d.check.ok)
    if (d.threads > 1) console.info(`[dsp-handcraft] 用时 ${secs} 秒，${d.threads} 个线程`)
    job.setStatus(
      ok
        ? `完成，用时 ${secs} 秒。`
        : `已生成，但有需要注意的地方（见下面「检查」），用时 ${secs} 秒。`,
      !ok,
    )
    $('sheet-name').textContent = d.title ?? `${d.target} ${fmt(d.rate)}/分`
    sheet.fillAlert(d)
    sheet.drawSheet(d)
    sheet.fillLegend(d)
    sheet.fillTitleBlock(d)
    sheet.fillPorts(d)
    sheet.fillNotes(d)
    sheet.fillPowerCard(d.energy)
    sheet.fillSheetStats(d)
    const text = outBlueprint(d.blueprint)
    publish(text, `${text.length.toLocaleString()} 字符`)
    const g = 'goal' in d ? d.goal : undefined
    if (g && !g.met && g.space < g.target && g.feasible)
      console.info(
        `[dsp-handcraft] 利用率 ${Math.round(g.space * 100)}%，没到这一档的 ${Math.round(g.target * 100)}%${g.stalled ? '（连续几段没进步，先停了）' : ''}`,
      )
    window.dispatchEvent(
      new CustomEvent('dsphc-done', {
        detail: {
          targets: state.targets.map((t) => ({ ...t })),
          ok,
          made: 'made' in d ? d.made : null,
        },
      }),
    )
  }
  function takeHandoff() {
    if (!handoff || handoff.took) return
    handoff.took = true
    const missing = state.targets.filter((t) => !items.has(t.id))
    if (missing.length) {
      handoff.auto = false
      job.setStatus(
        `带过来的目标里有 ${missing.length} 个这里不认识（物品 ID ${missing.map((t) => t.id).join('、')}），请在左上角重新选。`,
        true,
      )
      return
    }
    for (const id of handoff.ext) {
      const it = items.get(id)
      if (it) state.ext.add(it.name)
    }
    save()
    const source = handoff.from ? `「${handoff.from}」` : ''
    job.setStatus(
      handoff.beltless
        ? `已按${source}带过来的无带蓝图填好目标，点「生成蓝图」生成无带蓝图（物流方式选物流站时接站）`
        : `已按${source}带过来的方案填好目标、配方和设备，${handoff.auto ? '正在排布…' : '数量可以再改，好了点「生成蓝图」'}`,
    )
    supply.requestChain(true)
  }
  function receive(m: Response) {
    switch (m.type) {
      case 'catalog':
        if (m.id !== catId) return
        catalog.splice(0, catalog.length, ...m.list)
        items.clear()
        for (const it of catalog) items.set(it.id, it)
        if (state.legacyTarget) {
          const hit = catalog.find((x) => x.name === state.legacyTarget)
          if (hit) state.targets[0].id = hit.id
          state.legacyTarget = null
        }
        takeHandoff()
        settingsChanged.update()
        if (settings.firstVisit && !handoff) {
          settings.firstVisit = false
          supply.requestChain(true)
        }
        requestForecast()
        if (!worker.inline)
          window.setTimeout(() => {
            if (!job.ui.busy) worker.send({ type: 'bench' })
          }, 1500)
        break
      case 'bench':
        console.info(`[dsp-handcraft] 测速 ${Math.round(m.ms)} 毫秒（${m.threads} 个线程）`)
        requestForecast()
        break
      case 'progress':
        if (m.id === jobId) job.progress(m)
        break
      case 'preview':
        if (m.id === jobId && job.ui.busy) preview.accept(m)
        break
      case 'chain':
        supply.onChain(m.id, m.data)
        break
      case 'forecast':
        if (m.id === forecastId) {
          forecast = m.data
          job.forecast(forecast, !!handoff?.beltless)
          settingsChanged.update()
        }
        break
      case 'result':
        if (m.id === jobId) finish(m.data)
        break
      case 'inspected':
        flat.inspect(m.id, m.data)
        break
      case 'patched':
        sheet.onPatched(m.id, m.data)
        break
    }
  }
  function Sidebar() {
    useSyncExternalStore(settingsChanged.subscribe, settingsChanged.snapshot)
    return (
      <SettingsForm
        state={state}
        choose={choose}
        submit={submit}
        beltless={!!handoff?.beltless}
        changeLanguage={switchLanguage}
        onHeight={(n) => {
          state.labstack = n
          save()
        }}
        actions={
          <Generation
            job={job}
            cancel={cancel}
            suggest={(name) => {
              state.ext.add(name)
              save()
              submit()
            }}
          />
        }
        goals={
          <Targets
            state={state}
            catalog={catalog}
            items={items}
            pic={icons.pic}
            setRate={(i, rate) => {
              state.targets[i].rate = rate
              save()
            }}
            remove={(i) => {
              if (state.targets.length > 1) {
                state.targets.splice(i, 1)
                save()
              }
            }}
            changePage={(p) => {
              state.page = p
              save()
            }}
            resetRecipe={(id) => {
              delete state.recipes[id]
              supply.rareOffAdd(id)
              save()
            }}
            forecast={forecast}
            editSupply={() => supply.edit()}
            removeSupply={(name) => {
              supply.setExt(name, false)
              save()
            }}
            afterPick={(id, replace) => {
              const changed = !state.targets.some((t) => t.id === id)
              if (changed) {
                if (replace == null) state.targets.push({ id, rate: 60 })
                else {
                  state.targets[replace].id = id
                  if (state.targets.length === 1) state.ext.clear()
                }
              }
              save()
              job.suggest('')
              job.setStatus('')
              supply.openExt(changed)
            }}
          />
        }
      />
    )
  }
  function Equipment() {
    useSyncExternalStore(settingsChanged.subscribe, settingsChanged.snapshot)
    return <EquipmentBar state={state} choose={choose} icon={(id) => icons.toolbar(id)} />
  }
  const root = createRoot($('generator-root'))
  flushSync(() =>
    root.render(
      <>
        <Sidebar />
        <SupplyDialog suggest={() => supply.applySuggestion()} />
        {createPortal(
          <Workspace
            toolbar={<Equipment />}
            preview={<SearchPreview preview={preview} />}
            copy={(top) => <CopyButton model={clipboard} top={top} />}
            like={<LikeButton model={clipboard} />}
          />,
          $('generator-workspace'),
        )}
      </>,
    ),
  )
  const viewer: Viewer = createViewer({
    box: $('drawing'),
    enabled: () => true,
    onSelect: (id) => sheet.selectRoute(id),
    onFactory: (hint) => sheet.selectFactory(hint),
    onStation: (k) => sheet.selectStation(k),
    onMachine: (key) => sheet.selectMachine(key),
    onClear: () => sheet.clearRoute(),
    onZoom: (n) => {
      $('zoom-label').textContent = `${n}%`
    },
    zoomable: () => $('sheet').classList.contains('is-expanded'),
    drag: {
      grab: (el) => flat.drag.grab(el),
      move: (dx, dy) => flat.drag.move(dx, dy),
      end: (ok) => flat.drag.end(ok),
    },
  })
  const sheet: ReturnType<typeof createSheet> = createSheet({
    get last() {
      return last
    },
    get flat() {
      return !!flat?.current
    },
    get floors() {
      return floors
    },
    view,
    state,
    get busy() {
      return job.ui.busy
    },
    byId: items,
    viewer,
    send: (m) => worker.send(m),
    setStatus: job.setStatus,
    saveSettings: save,
    outBlueprint,
    pic: icons.pic,
    drawIcon: icons.drawIcon,
  })
  const flat: ReturnType<typeof createFlat> = createFlat({
    viewer,
    items,
    send: (m) => worker.send(m),
    buildParams: params,
    setStatus: job.setStatus,
    newResult: () => clipboard.newResult(),
    resetSheet() {
      last = null
      Object.assign(view, emptySelection)
      sheet.renderStation()
    },
    fillPowerCard: sheet.fillPowerCard,
    railTab: sheet.railTab,
    drawIcon: icons.drawIcon,
    pic: icons.pic,
    publish,
  })
  const supply = createSupply({
    state,
    getHandoff: () => handoff,
    getForecast: () => forecast,
    getItem: (id) => items.get(id),
    pic: icons.pic,
    categoryColor: (n) => categoryColors[n],
    send: (m) => worker.send(m),
    saveSettings: save,
    hideSuggestion: () => job.suggest(''),
    setStatus: job.setStatus,
  })
  for (const event of ['pointerdown', 'wheel'])
    $('drawing').addEventListener(event, () => preview.moved(), { passive: true })
  window.addEventListener('hashchange', () => {
    if (readHandoff(location.hash)) location.reload()
  })
  icons.start(() => {
    settingsChanged.update()
    supply.renderExt()
  })
  void clipboard.load()
  if (window.dsphcLang === 'en') {
    try {
      startEnglish()
    } finally {
      document.documentElement.classList.remove('i18n-wait')
    }
  }
  const worker = createWorkerClient(WORKER_SRC, receive, (message) => {
    job.setBusy(false)
    job.setStatus(`后台计算出错：${message}`, true)
  })
  worker.send({ type: 'init', src: WORKER_SRC, threads: navigator.hardwareConcurrency || 4 })
  if (state.defs) worker.send({ type: 'defs', defs: state.defs })
  worker.send({ type: 'catalog', id: ++catId, raw: [] })
}
mountGenerator()
