import { drawingSvg, sliceRoutes, type DrawingModel } from '../drawing.js'
import type { Viewer } from '../viewer.js'
import { byId as $, signal } from './shared'
import type { Preview } from './worker-client'
export function createPreview(getViewer: () => Viewer, onWatch: (round: number | null) => void) {
  const changed = signal()
  const rounds = new Map<number, number>()
  let gen = -1,
    watch: 'auto' | number = 'auto',
    model: DrawingModel | null = null,
    modelRound: number | null = null,
    drawn: DrawingModel | null = null,
    lastPaint = 0,
    userMoved = false,
    waiting = false
  function render(force: boolean) {
    const now = performance.now()
    if (!force && now - lastPaint < 500) return
    lastPaint = now
    changed.update()
    const selected = watch === 'auto' ? modelRound : watch
    if (!drawn && !waiting) {
      waiting = true
      getViewer().reset()
      $('drawing').innerHTML = '<div class="empty"><strong>搜索中</strong></div>'
    }
    if (!model || selected !== modelRound || selected == null || model === drawn) return
    drawn = model
    const box = $('drawing')
    box.classList.add('has-svg')
    box.innerHTML = drawingSvg(model, sliceRoutes(model.routes), {
      level: 'all',
      id: 'preview',
      label: `搜索中 · 第 ${selected + 1} 轮的当前排法`,
    })
    getViewer().attach(box.querySelector('svg'), !userMoved)
    $('floor-name').textContent = '搜索中'
    $('floor-description').textContent = `第 ${selected + 1} 轮`
    $('floor-meta').textContent = `${model.width} × ${model.height} 格`
  }
  function accept(m: Preview) {
    if (m.gen !== gen) {
      gen = m.gen
      rounds.clear()
      model = null
      modelRound = null
    }
    rounds.set(m.round, m.best)
    if (m.model) {
      model = m.model
      modelRound = m.round
    }
    render(!!m.model)
  }
  function reset() {
    gen = -1
    rounds.clear()
    watch = 'auto'
    model = null
    modelRound = null
    drawn = null
    lastPaint = 0
    userMoved = false
    waiting = false
    changed.update()
  }
  return {
    accept,
    reset,
    moved() {
      if (rounds.size) userMoved = true
    },
    changed,
    rounds,
    get watch() {
      return watch
    },
    select(round: 'auto' | number) {
      watch = round
      onWatch(round === 'auto' ? null : round)
      render(true)
    },
  }
}
