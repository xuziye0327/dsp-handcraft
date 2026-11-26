import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import type { SheetContext, StationConfig, StationSettings, StorageValues } from './sheet-types'
import { savedSlot, ROLE_NAMES } from './sheet-ui'

const slotPositions = [
  [1, 2],
  [0, 2],
  [-1, 2],
  [-2, 1],
  [-2, 0],
  [-2, -1],
  [-1, -2],
  [0, -2],
  [1, -2],
  [2, -1],
  [2, 0],
  [2, 1],
] as const
interface StationRange {
  k: keyof StationSettings
  name: string
  min: number
  max: number
  step: number
  show(v: number): string
  decode?(v: number): number
  encode?(v: number): number
}
const ranges: StationRange[] = [
  {
    k: 'workEnergyPerTick',
    name: '最大充能功率',
    min: 30,
    max: 300,
    step: 1,
    show: (v) => `${v} MW`,
  },
  {
    k: 'tripRangeOfDrones',
    name: '运输机最远路程',
    min: 20,
    max: 180,
    step: 1,
    show: (v) => `${v}°`,
  },
  {
    k: 'tripRangeOfShips',
    name: '运输船最远路程',
    min: 1,
    max: 61,
    step: 1,
    show: (v) => (v > 60 ? '∞' : `${v} ly`),
    decode: (v) => (v > 60 ? 61 : v),
    encode: (v) => (v > 60 ? 10000 : v),
  },
  {
    k: 'warpEnableDistance',
    name: '曲速启用路程',
    min: 0.5,
    max: 60,
    step: 0.5,
    show: (v) => `${v} AU`,
  },
  {
    k: 'deliveryAmountOfDrones',
    name: '运输机起送量',
    min: 1,
    max: 100,
    step: 1,
    show: (v) => `${v}%`,
  },
  {
    k: 'deliveryAmountOfShips',
    name: '运输船起送量',
    min: 1,
    max: 100,
    step: 1,
    show: (v) => `${v}%`,
  },
]
const switches = [
  ['includeOrbitCollector', '轨道采集器'],
  ['warperNecessary', '翘曲器必备'],
] as const
function StationDiagram({
  ctx,
  cfg,
  k,
  rotated,
}: {
  ctx: SheetContext
  cfg: StationConfig
  k: number
  rotated: boolean
}) {
  return (
    <svg className="st-map" viewBox="-4.6 -4.6 9.2 9.2" aria-hidden="true">
      <g transform={rotated ? 'rotate(90)' : undefined}>
        <path
          d="M-1.9 -2.5H1.9L2.5 -1.9V1.9L1.9 2.5H-1.9L-2.5 1.9V-1.9Z"
          fill="#112f52"
          stroke="#cfe0f2"
          strokeWidth="0.1"
        />
        <circle r="1.5" fill="none" stroke="#7f9fc2" strokeWidth="0.05" />
        {cfg.slots.map((sl, i) => {
          const pos = slotPositions[i]
          if (!pos) return null
          const [dx, dy] = pos,
            horizontal = Math.abs(dx) === 2
          const nx = horizontal ? Math.sign(dx) : 0,
            ny = horizontal ? 0 : -Math.sign(dy)
          const at = (r: number) =>
            [(horizontal ? 0 : dx * 1.25) + nx * r, (horizontal ? -dy * 1.25 : 0) + ny * r] as const
          const [ix, iy] = at(3.75)
          const item = sl.dir && cfg.storage[sl.storageIdx - 1]?.itemId
          if (!item) return <circle key={i} cx={ix} cy={iy} r="0.1" fill="#5d7da1" />
          const out = sl.dir === 1,
            [ax, ay] = at(out ? 2.95 : 2.65),
            [bx, by] = at(out ? 2.65 : 2.95)
          return (
            <g key={i}>
              <title>{`${i + 1} 号口 · ${out ? '出站' : '进站'} · ${ctx.byId.get(item)?.name ?? ''}`}</title>
              <path
                d={`M${bx - ny * 0.2} ${by - nx * 0.2}L${ax} ${ay}L${bx + ny * 0.2} ${by + nx * 0.2}Z`}
                fill={out ? '#9ad0f5' : '#ffd166'}
              />
              <g
                transform={`translate(${ix} ${iy}) scale(1.36)`}
                dangerouslySetInnerHTML={{ __html: ctx.drawIcon(item) ?? '' }}
              />
            </g>
          )
        })}
      </g>
      <text y="0.3" textAnchor="middle" fontSize="0.85" fill="#e6f0ff" fontWeight="600">
        T{k + 1}
      </text>
    </svg>
  )
}
interface SliderProps {
  value: number
  min: number
  max: number
  step: number
  label?: string
  setting?: string
  storage?: boolean
  onSlide: (value: number) => void
  onCommit: (value: number) => void
}
function Slider({ value, min, max, step, label, setting, storage, onSlide, onCommit }: SliderProps) {
  const input = useRef<HTMLInputElement>(null)
  // Native change fires on release. React's range onChange fires on every input.
  useEffect(() => {
    const el = input.current
    if (!el) return
    const commit = () => onCommit(el.valueAsNumber)
    el.addEventListener('change', commit)
    return () => el.removeEventListener('change', commit)
  }, [onCommit])
  return (
    <input
      ref={input}
      type="range"
      className="st-slider"
      data-s={setting}
      data-k={storage ? 'max' : undefined}
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      style={{ '--p': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
      onChange={(e) => onSlide(e.currentTarget.valueAsNumber)}
    />
  )
}
function SettingSlider({
  range,
  v,
  commit,
}: {
  range: StationRange
  v: number
  commit: (v: number) => void
}) {
  const [value, setValue] = useState(range.decode?.(v) ?? v)
  return (
    <label className="st-set-row">
      <span>{range.name}</span>
      <Slider
        setting={range.k}
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onSlide={setValue}
        onCommit={(v) => commit(range.encode?.(v) ?? v)}
      />
      <b className="num">{range.show(value)}</b>
    </label>
  )
}
interface StorageRowProps {
  entry: StationConfig['storage'][number]
  i: number
  cfg: StationConfig
  ctx: SheetContext
  commit: (v: StorageValues) => void
}
function StorageRow({ entry, i, cfg, ctx, commit }: StorageRowProps) {
  const [v, set] = useState<StorageValues>(() => ({
    localRole: entry.localRole,
    remoteRole: entry.remoteRole,
    max: entry.max,
  }))
  if (!entry.itemId)
    return (
      <div className="st-row is-empty">
        <span className="st-ico">
          <span className="st-hole" />
        </span>
        <span className="st-empty">空栏位</span>
      </div>
    )
  const it = ctx.byId.get(entry.itemId) ?? { name: String(entry.itemId) }
  const ports = cfg.slots.filter((sl) => sl.dir && sl.storageIdx === i + 1)
  const portTxt = ports.length
    ? `${ports.length} 个口${ports.every((sl) => sl.dir === 1) ? '出站' : ports.every((sl) => sl.dir === 2) ? '进站' : '进出'}`
    : '没接带子'
  const update = (next: StorageValues) => {
    set(next)
    commit(next)
  }
  const role = (key: 'localRole' | 'remoteRole', side: string) => (
    <button
      type="button"
      className={`st-role r${v[key]}`}
      data-k={key}
      data-v={v[key]}
      title="点一下换：供应 → 需求 → 仓储"
      onClick={() => update({ ...v, [key]: (v[key] + 1) % 3 })}
    >{`${side}${ROLE_NAMES[v[key]]}`}</button>
  )
  return (
    <div className={`st-row r${v.remoteRole}`} data-i={i}>
      <span className="st-ico" dangerouslySetInnerHTML={{ __html: ctx.pic(it) }} />
      <div className="st-mid">
        <div className="st-name">
          <b>{it.name}</b>
          <small>{portTxt}</small>
          {savedSlot(entry.itemId) && (
            <span className="st-keep" title="改了会记住，以后生成的蓝图也这样设">
              记住
            </span>
          )}
        </div>
        <div className="st-cap">
          上限 <b className="num">{v.max}</b>
        </div>
        <Slider
          storage
          value={v.max}
          label={`${it.name}上限`}
          min={0}
          max={entry.max > 10000 ? 20000 : 10000}
          step={100}
          onSlide={(max) => set({ ...v, max })}
          onCommit={(max) => update({ ...v, max })}
        />
      </div>
      <div className="st-btns">
        {role('localRole', '本地')}
        {role('remoteRole', '星际')}
      </div>
    </div>
  )
}
interface StationPanelProps {
  ctx: SheetContext
  cfg: StationConfig
  k: number
  rotated: boolean
  storageChanged: (i: number, v: StorageValues) => void
  settingChanged: (key: keyof StationSettings, value: number | boolean) => void
}
export function StationPanel({
  ctx,
  cfg,
  k,
  rotated,
  storageChanged,
  settingChanged,
}: StationPanelProps) {
  const set = cfg.set ?? {}
  return (
    <>
      <StationDiagram ctx={ctx} cfg={cfg} k={k} rotated={rotated} />
      <div className="st-rows">
        {cfg.storage.map((x, i) => (
          <StorageRow
            key={i}
            i={i}
            entry={x}
            cfg={cfg}
            ctx={ctx}
            commit={(v) => storageChanged(i, v)}
          />
        ))}
      </div>
      <h3 className="st-h">
        物流站设置<small>整张图的站一起改，会记住</small>
      </h3>
      <div className="st-sets">
        {ranges.map((r) => {
          const v = set[r.k]
          return typeof v === 'number' ? (
            <SettingSlider key={r.k} range={r} v={v} commit={(v) => settingChanged(r.k, v)} />
          ) : null
        })}
        <div className="st-checks">
          {switches.map(([key, name]) =>
            set[key] == null ? null : (
              <label key={key} className="st-check">
                <input
                  type="checkbox"
                  data-s={key}
                  defaultChecked={!!set[key]}
                  onChange={(e) => settingChanged(key, e.currentTarget.checked)}
                />
                {name}
              </label>
            ),
          )}
        </div>
      </div>
      <p className="st-note">{`出货叠 ${cfg.pilerCount || 1} 层。改了就写进蓝图字符串。`}</p>
    </>
  )
}
