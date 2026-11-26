import type { CSSProperties } from 'react'

import { fmt } from './shared'
import type { SupplyChain, SupplyGraph, Unit, SupplyAppearance } from './supply-types'
const rawTag = (u: Unit) => (u.type === 1 ? '原矿' : u.type === 10 ? '黑雾掉落' : '由外部供给')
interface CardProps {
  data: SupplyChain
  graph: SupplyGraph
  unit: Unit
  near: boolean
  ui: SupplyAppearance
  focus: (id: number) => void
  toggle: (unit: Unit, b: HTMLButtonElement) => void
}
export function ItemCard({ data: d, graph: G, unit: u, near, ui, focus, toggle }: CardProps) {
  const isGoal = d.goals.some((g) => g.id === u.id),
    blocking = d.blocking.includes(u.name)
  const fixed = isGoal || u.state === 'raw' || u.state === 'by'
  const co = u.state === 'line' && u.co != null
  const tag = u.state === 'raw' ? rawTag(u) : u.state === 'by' || co ? '副产' : ''
  const cls = [
    'xt',
    isGoal && 'is-goal',
    u.state === 'external' && 'is-ext',
    u.state === 'raw' && 'is-raw',
    u.state === 'by' && 'is-by',
    co && 'is-co',
    blocking && 'is-blocking',
    near && 'near',
  ]
    .filter(Boolean)
    .join(' ')
  const n = u.levels ? `${u.count} 叠×${u.levels} 层` : `${u.count} 台`
  const sub = isGoal
    ? `出 ${fmt(u.out ?? u.rate)}/分，${n}`
    : blocking
      ? `需要${u.factory}`
      : u.state === 'line' && !co
        ? `${fmt(u.rate)}/分，${n}`
        : `${fmt(u.rate)}/分`
  const nameOf = (id: number) => G.nodes.find((node) => node.id === id)?.name ?? ''
  const uses = G.edges.filter((e) => e.from === u.id && e.state !== 'by').map((e) => nameOf(e.to))
  const by = G.edges
    .filter((e) => e.from === u.id && e.state === 'by')
    .map((e) => `${nameOf(e.to)} ${fmt(e.rate)}/分`)
  const left = d.surplus.find((x) => x.id === u.id)
  const usesTxt =
    (uses.length ? `，用于 ${uses.join('、')}` : '') +
    (by.length ? `，副产 ${by.join('、')}` : '') +
    (left ? `，其中 ${fmt(left.rate)}/分用不完、跟着这条带送出` : '')
  const tip = isGoal
    ? `${u.name}：最终目标，${u.factory} ${n}${usesTxt}`
    : blocking
      ? `${u.name}：需要${u.factory}，目前排不了，请设为外部供应${usesTxt}`
      : u.state === 'external'
        ? `${u.name}：外部供应 ${fmt(u.rate)}/分${usesTxt}。点击改回在产线里生产`
        : u.state === 'raw'
          ? `${u.name}：${tag} ${fmt(u.rate)}/分${usesTxt}`
          : u.state === 'by'
            ? `${u.name}：${G.edges
                .filter((e) => e.to === u.id)
                .map((e) => nameOf(e.from))
                .join('、')}那组工厂的副产物 ${fmt(u.rate)}/分，单独一条带送出产线`
            : co
              ? `${u.name}：和${nameOf(u.co!)}同一组工厂出（${u.factory} ${n}）${fmt(u.rate)}/分${usesTxt}。点击设为外部供应`
              : `${u.name}：${u.factory} ${n}，${fmt(u.rate)}/分${usesTxt}。点击设为外部供应`
  return (
    <button
      type="button"
      className={cls}
      style={{ '--cat': u.type == null ? undefined : ui.categoryColor(u.type) } as CSSProperties}
      data-id={u.id}
      data-name={u.name}
      title={tip}
      aria-pressed={u.state === 'external'}
      aria-disabled={fixed || undefined}
      onFocus={() => focus(u.id)}
      onMouseOver={() => focus(u.id)}
      onClick={(e) => {
        if (!fixed) toggle(u, e.currentTarget)
      }}
    >
      <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: ui.pic(u) }} />
      <span className="nm">{u.name}</span>
      <span className="sub" data-tag={tag || undefined}>
        {sub}
      </span>
    </button>
  )
}
export function SupplyFooter({
  data: d,
  graph: G,
  focus,
}: {
  data: SupplyChain
  graph: SupplyGraph
  focus: number | null
}) {
  const node = G.nodes.find((n) => n.id === focus)
  if (node) {
    const nameOf = (id: number) => G.nodes.find((u) => u.id === id)?.name
    const down = G.edges
      .filter((e) => e.from === focus)
      .map((e) =>
        e.via
          ? `${nameOf(e.to)}（同一组）`
          : `${nameOf(e.to)}${e.state === 'by' ? '（副产）' : ''} ${fmt(e.rate)}/分`,
      )
    const up = G.edges.filter((e) => e.to === focus && e.state !== 'by').map((e) => nameOf(e.from))
    const together = G.edges
      .filter((e) => e.to === focus && e.state === 'by')
      .map((e) => nameOf(e.from))
    const description =
      node.state === 'by'
        ? `：${together.join('、')}那组工厂的副产物 ${fmt(node.rate)}/分，单独一条带送出产线`
        : `${down.length ? ` → ${down.join('、')}` : ''}${together.length ? `；和${together.join('、')}同一组工厂出` : ''}${up.length ? `；原料来自 ${up.join('、')}` : node.state === 'raw' ? `；${rawTag(node)}` : ''}`
    return (
      <span key={node.id}>
        <b>{node.name}</b>
        {description}
      </span>
    )
  }
  const raws = d.raws.map((r) => `${r.name} ${fmt(r.rate)}/分`).join('、')
  const ext = d.units.filter((u) => u.state === 'external').map((u) => u.name)
  const base = d.blocking.length ? (
    <span className="warn">{`${d.blocking.join('、')} 需要原油精炼厂等，产线排不了。${d.suggested.length ? `建议把 ${d.suggested.join('、')} 设为外部供应，点「按建议设置」即可。` : '请把它们设为外部供应。'}`}</span>
  ) : (
    `由外部供给：${ext.length ? `${ext.join('、')}（外部供应），` : ''}${raws || '无'}。`
  )
  const extra =
    (d.byproducts.length
      ? ` 副产：${d.byproducts.map((b) => `${b.name} ${fmt(b.rate)}/分（${b.of}）单独一条带送出`).join('、')}。`
      : '') +
    (d.surplus.length
      ? ` 用不完：${d.surplus.map((x) => `${x.name} ${fmt(x.rate)}/分`).join('、')}，跟着那条带送出。`
      : '')
  return (
    <span key="summary">
      {base}
      {extra}
    </span>
  )
}
