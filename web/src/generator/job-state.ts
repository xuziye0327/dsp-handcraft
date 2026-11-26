import { fmt, signal, type Forecast } from './shared'
import type { Progress } from './worker-client'
export function createGeneration(onTransition: () => void) {
  const changed = signal()
  const ui = {
    busy: false,
    text: '',
    error: false,
    percent: 0,
    slow: false,
    suggest: '',
    forecast: '',
  }
  let timer: number | undefined,
    progress: Progress = {},
    estimate: number | null = null
  function setStatus(text: string, error = false) {
    Object.assign(ui, { text, error })
    changed.update()
  }
  function setBusy(on: boolean) {
    window.clearInterval(timer)
    ui.busy = on
    ui.percent = 0
    ui.slow = false
    progress = {}
    estimate = null
    onTransition()
    changed.update()
    if (!on) return
    const start = performance.now()
    timer = window.setInterval(() => {
      const used = (performance.now() - start) / 1000
      if (!estimate) {
        setStatus(`正在排布，已用 ${used.toFixed(1)} 秒`)
        return
      }
      const est = Math.ceil(estimate),
        stage = progress.finish?.[1]
          ? 0.85 + (0.1 * progress.finish[0]) / progress.finish[1]
          : progress.search?.[1]
            ? (0.85 * progress.search[0]) / progress.search[1]
            : 0
      ui.percent = Math.min(99, 100 * Math.max(used / est, stage))
      ui.slow = used > est
      const best =
        progress.round && progress.best != null && progress.feasible
          ? ` · 目前最好 ${Math.round(progress.best * 100)}%`
          : ''
      setStatus(
        ui.slow
          ? `比预计（约 ${est} 秒）久，还在算，已用 ${used.toFixed(0)} 秒${best}`
          : `正在排布：预计约 ${est} 秒，已用 ${used.toFixed(1)} 秒${best}`,
      )
    }, 100)
  }
  function forecast(d: Forecast, beltless: boolean) {
    if (d.error || !d.machines || !d.byFactory || !d.power) ui.forecast = ''
    else {
      const kinds =
        d.byFactory
          .slice(0, 4)
          .map((f) => `${f.name} ${fmt(f.count)}`)
          .join('、') + (d.byFactory.length > 4 ? ' 等' : '')
      const rest = [
        d.seconds && d.seconds > 0 && !beltless ? `预计约 ${Math.ceil(d.seconds)} 秒` : '',
        `工厂满负荷约 ${d.power.maxText}`,
      ].filter(Boolean)
      ui.forecast = `建筑 ${fmt(d.machines)} 台（${kinds}）· ${rest.join(' · ')}`
    }
    changed.update()
  }
  return {
    ui,
    changed,
    setBusy,
    setStatus,
    forecast,
    suggest(item: string) {
      ui.suggest = item
      changed.update()
    },
    progress(p: Progress) {
      progress = { ...progress, ...p }
      estimate ??= p.est ?? null
    },
  }
}
