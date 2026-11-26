import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { fillPorts } from './sheet-details'
import { renderMachine } from './sheet-machine'
import { StationPanel } from './sheet-station'
import type {
  SheetContext,
  PatchData,
  SheetResult,
  StorageValues,
  StationSettings,
} from './sheet-types'
import { element as $, savedSlot } from './sheet-ui'

export function createStation(ctx: SheetContext, signal: AbortSignal) {
  let patchId = 0,
    revision = 0
  let root: Root | null = null
  const waiters = new Map<number, (r: PatchData) => void>()
  let queue = Promise.resolve()
  function onPatched(id: number, data: PatchData) {
    const resolve = waiters.get(id)
    waiters.delete(id)
    resolve?.(data)
  }
  function patch(
    d: SheetResult,
    k: number,
    storage: (StorageValues | null)[],
    set: StationSettings | null,
  ) {
    // Start from the last acknowledged blueprint, including earlier edits in this queue.
    queue = queue
      .then(async () => {
        if (signal.aborted) return
        const r = await new Promise<PatchData>((resolve, reject) => {
          const id = ++patchId
          waiters.set(id, resolve)
          try {
            ctx.send({ type: 'patch', id, str: d.blueprint, k, storage, set })
          } catch (err) {
            waiters.delete(id)
            reject(err)
          }
        })
        if (signal.aborted) return
        if ('error' in r) throw new Error(r.error)
        d.blueprint = r.blueprint
        d.stationCfg = r.stationCfg
        if (ctx.last !== d) return
        const bp = $<HTMLTextAreaElement>('bp')
        bp.value = ctx.outBlueprint(d.blueprint)
        $('bp-meta').textContent = `${bp.value.length.toLocaleString()} 字符`
        fillPorts(ctx, d)
      })
      .catch((e: unknown) => {
        if (signal.aborted) return
        ctx.setStatus(`改物流站设置没成功：${e instanceof Error ? e.message : String(e)}`, true)
        if (ctx.last === d && ctx.view.station === k) renderStation()
      })
  }
  function renderStation() {
    renderMachine(ctx)
    const k = ctx.view.station,
      d = ctx.last,
      cfg = k != null ? d?.stationCfg[k] : null
    $('station-info').hidden = !cfg
    if (!cfg || k == null || !d) {
      root?.render(null)
      return
    }
    $('station-title').textContent = `物流站 T${k + 1}`
    if (!root) {
      const host = $('station-body')
      host.dataset.reactRoot = '' // Translate text without replacing React-owned nodes.
      root = createRoot(host)
    }
    const storageChanged = (i: number, v: StorageValues) => {
      const keep = savedSlot(cfg.storage[i]?.itemId)
      if (keep) {
        ctx.state.stationPrefs = { ...ctx.state.stationPrefs, [keep]: v }
        ctx.saveSettings()
      }
      patch(
        d,
        k,
        cfg.storage.map((_, j) => (i === j ? v : null)),
        null,
      )
    }
    const settingChanged = (key: string, value: number | boolean) => {
      ctx.state.stationPrefs = {
        ...ctx.state.stationPrefs,
        station: { ...ctx.state.stationPrefs?.station, [key]: value },
      }
      ctx.saveSettings()
      patch(d, k, [], { [key]: value })
    }
    root.render(
      createElement(StationPanel, {
        key: ++revision,
        ctx,
        cfg,
        k,
        rotated: !!d.model.rotated,
        storageChanged,
        settingChanged,
      }),
    )
  }
  $('close-station').addEventListener(
    'click',
    () => {
      ctx.view.station = null
      renderStation()
    },
    { signal },
  )
  $('close-machine').addEventListener(
    'click',
    () => {
      ctx.view.machine = null
      renderStation()
    },
    { signal },
  )
  signal.addEventListener(
    'abort',
    () => {
      root?.unmount()
      for (const resolve of waiters.values()) resolve({ error: 'Sheet closed' })
      waiters.clear()
    },
    { once: true },
  )
  return {
    renderStation,
    onPatched,
    selectStation(k: number) {
      if (ctx.busy || !ctx.last?.stationCfg[k]) return
      ctx.view.station = k
      ctx.view.machine = null
      renderStation()
    },
    selectMachine(key: string) {
      if (ctx.busy || !ctx.last) return
      ctx.view.machine = key
      ctx.view.station = null
      renderStation()
    },
  }
}
