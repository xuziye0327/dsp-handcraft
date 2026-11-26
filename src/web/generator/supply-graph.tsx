import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { ItemCard, SupplyFooter } from './supply-cards'
import { extGraph, GRAPH, graphRoutes, layoutGraph, type Layout } from './supply-layout'
import type { SupplyChain, SupplyAppearance, SupplyGraph } from './supply-types'
import { bindViewport, type ZoomAction, type ZoomMemory } from './supply-viewport'

function graphLinks(G: SupplyGraph, L: Layout, o: typeof GRAPH) {
  // SVG contains only graph coordinates and numeric item IDs. Each path keeps
  // its own endpoint set so highlighting a branch never lights the whole bus.
  const id = (k: number) => G.nodes[k]!.id
  const seg = (to: number, from: number[], d: string, cls: string) =>
    `<path class="ln${cls ? ` ${cls}` : ''}" data-to="${id(to)}" data-from="${from.map(id).join(' ')}" d="${d}"/>`
  const byKey = new Set(G.edges.filter((e) => e.state === 'by').map((e) => `${e.from}>${e.to}`))
  let s = ''
  for (const r of graphRoutes(G, L, o)) {
    const all = r.drops.map((q) => q.from),
      by = r.drops.every((q) => byKey.has(`${id(q.from)}>${id(r.to)}`)) ? 'by' : ''
    s += `<path class="ar" data-to="${id(r.to)}" data-from="${all.map(id).join(' ')}" d="M${r.px} ${r.bottom + 1}l4 6h-8z"/>`
    s += seg(r.to, all, `M${r.px} ${r.bottom + 7}V${r.bar}`, by)
    const xs = [...new Set([r.px, ...r.drops.map((q) => q.x)])].sort((a, b) => a - b)
    for (let i = 1; i < xs.length; i++) {
      const a = xs[i - 1]!,
        b = xs[i]!
      s += seg(
        r.to,
        r.drops.filter((q) => (b <= r.px ? q.x <= a : q.x >= b)).map((q) => q.from),
        `M${a} ${r.bar}H${b}`,
        by,
      )
    }
    for (const q of r.drops)
      s += seg(
        r.to,
        [q.from],
        `M${q.x} ${r.bar}V${q.top}`,
        by || (G.nodes[q.from]!.state === 'external' ? 'ext' : ''),
      )
  }
  return `<g transform="matrix(1 0 0 -1 0 ${L.height})">${s}</g>`
}
interface GraphProps {
  data: SupplyChain
  ui: SupplyAppearance
  tiers: HTMLElement
  foot: HTMLElement
  memory: ZoomMemory
  toggle: (name: string) => void
  revision: number
}
export function DependencyGraph({ data, ui, tiers, foot, memory, toggle, revision }: GraphProps) {
  const graph = useMemo(() => extGraph(data), [data])
  const [active, setFocus] = useState<number | null>(null),
    [zoom, showZoom] = useState(memory.value)
  const focus = graph.nodes.some((n) => n.id === active) ? active : null
  if (active !== focus) setFocus(focus)
  const near = new Set(
    focus == null
      ? []
      : [
          focus,
          ...graph.edges.filter((e) => e.from === focus).map((e) => e.to),
          ...graph.edges.filter((e) => e.to === focus).map((e) => e.from),
        ],
  )
  const canvas = useRef<HTMLDivElement>(null),
    wrap = useRef<HTMLDivElement>(null),
    stage = useRef<HTMLDivElement>(null),
    links = useRef<SVGSVGElement>(null)
  const viewport = useRef<ReturnType<typeof bindViewport> | null>(null)
  useLayoutEffect(() => {
    const v = bindViewport(canvas.current!, wrap.current!, stage.current!, tiers, memory, showZoom)
    viewport.current = v
    const blur = () => setFocus(null)
    tiers.addEventListener('mouseleave', blur)
    return () => {
      v.dispose()
      viewport.current = null
      tiers.removeEventListener('mouseleave', blur)
      tiers.classList.remove('has-focus')
    }
  }, [tiers, memory])
  useLayoutEffect(() => {
    const els = Array.from(stage.current!.querySelectorAll<HTMLButtonElement>('.xt'))
    const o = { ...GRAPH, h: Math.max(0, ...els.map((el) => el.offsetHeight)) || GRAPH.h }
    const L = layoutGraph(graph, o)
    els.forEach((el, k) => {
      el.style.left = `${L.pos[k]!.x - o.w / 2}px`
      el.style.top = `${L.height - L.pos[k]!.y - o.h}px`
    })
    links.current!.innerHTML = graphLinks(graph, L, o)
    viewport.current!.place(L.width, L.height, L.pos[0]?.x ?? 0)
  }, [graph, revision])
  useLayoutEffect(() => {
    tiers.classList.toggle('has-focus', focus != null)
    const svg = links.current!
    svg
      .querySelectorAll<SVGPathElement>('[data-to]')
      .forEach((p) =>
        p.classList.toggle(
          'on',
          focus != null &&
            (Number(p.dataset.to) === focus ||
              p.dataset.from!.split(' ').some((f) => Number(f) === focus)),
        ),
      )
    if (focus != null) svg.firstElementChild?.append(...svg.querySelectorAll('.on'))
  }, [active, focus, graph, revision, tiers])
  const action = (how: ZoomAction) => viewport.current?.action(how)
  return (
    <>
      <div className="tree-canvas" ref={canvas}>
        <div className="tree-zoom" ref={wrap}>
          <div className="tree-stage" ref={stage}>
            <svg className="tree-links" aria-hidden="true" ref={links} />
            {graph.nodes.map((u) => (
              <ItemCard
                key={u.id}
                data={data}
                graph={graph}
                unit={u}
                near={near.has(u.id)}
                ui={ui}
                focus={setFocus}
                toggle={(unit, b) => {
                  if (viewport.current?.anchor(b)) toggle(unit.name)
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <fieldset className="tree-tools" aria-label="缩放画布">
        <button
          type="button"
          data-tree-zoom="out"
          aria-label="缩小"
          title="缩小"
          onClick={() => action('out')}
        >
          −
        </button>
        <button
          type="button"
          data-tree-zoom="reset"
          className="zoom-pct"
          title="回到 100%"
          onClick={() => action('reset')}
        >{`${Math.round(zoom * 100)}%`}</button>
        <button
          type="button"
          data-tree-zoom="in"
          aria-label="放大"
          title="放大"
          onClick={() => action('in')}
        >
          +
        </button>
        <button
          type="button"
          data-tree-zoom="fit"
          title="缩到整张图放得下"
          onClick={() => action('fit')}
        >
          全图
        </button>
      </fieldset>
      {createPortal(<SupplyFooter data={data} graph={graph} focus={focus} />, foot)}
    </>
  )
}
