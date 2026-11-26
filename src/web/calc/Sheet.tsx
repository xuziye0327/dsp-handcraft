import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { quoteAll as quote, num, shown } from './display'
import {
  active,
  BELTS,
  BY_KEY,
  EPS,
  KIND_LABEL,
  MACHINES,
  PRODUCERS,
  QUICK,
  SOURCE,
  pickOf,
  sourceOf,
  state,
  type Recipe,
  type Result,
  type Row,
  type Run,
} from './model'
import { Icon, ItemBox as Box } from './ui'

export interface SheetActions {
  selectItem: (name: string) => void
  commit: (change: () => void) => void
  removeBuilt: (index: number) => void
  quickGoal: (name: string) => void
}

type MenuKind = 'recipe' | 'machine' | 'spray'
type OpenMenu = (kind: MenuKind, id: string, anchor: HTMLButtonElement) => void
type SheetMenu = { kind: MenuKind; id: string; anchor: HTMLButtonElement }
type Picks = ReturnType<typeof pickOf>
type RecordLine = NonNullable<Row['recs']>[number]

const classes = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ')
const sprayLabel = (mode: Run['mode']) =>
  mode === 'extra' ? '增产' : mode === 'speed' ? '加速' : '不喷'

function RecipeLine({ r }: { r: Recipe }) {
  const io = (items: Recipe['q']) =>
    items.map(({ name, n }, i) => (
      <span className="io" key={`${name}-${i}`}>
        <Icon name={name} cls="s22" tip />
        <sub>{num(n)}</sub>
      </span>
    ))
  return (
    <>
      {io(r.q)}
      <i className="ico to" aria-hidden="true" />
      {io(r.s)}
      <span className="sec">{`${num(r.t)} 秒`}</span>
    </>
  )
}

function Factory({ u, open }: { u: Run; open: OpenMenu }) {
  if (u.count < 1e-6 || !u.machine) return <span className="same">不用建，副产的已经够了</span>
  const name = u.machine[0]
  const many = (MACHINES[u.r.kind]?.length ?? 0) > 1
  return (
    <div className="fab">
      <span className="count" title={`精确 ${u.count.toFixed(3)} 台`}>
        <b>{Math.ceil(u.count - 1e-6)}</b>
        {Math.abs(u.count - Math.round(u.count)) > 1e-6 && <small>{num(u.count)}</small>}
      </span>
      <button
        className={classes('cell', !!state.machineOf[u.r.key] && 'changed')}
        type="button"
        data-act="machine"
        data-key={u.r.key}
        disabled={!many}
        title={many ? '这一行换一种型号' : undefined}
        onClick={(e) => open('machine', u.r.key, e.currentTarget)}
      >
        <Icon name={name} cls="s24" />
        <span className="lbl">{shown(name)}</span>
      </button>
    </div>
  )
}

function Spray({ u, open }: { u: Run; open: OpenMenu }) {
  if (u.r.noExtra === null || !u.r.q.length) return <span className="same">—</span>
  return (
    <button
      className={classes('cell', !!state.sprayOf[u.r.key] && 'changed')}
      type="button"
      data-act="spray"
      data-key={u.r.key}
      onClick={(e) => open('spray', u.r.key, e.currentTarget)}
    >
      <span className={classes('lbl', u.mode ? 'spray-on' : 'muted')}>{sprayLabel(u.mode)}</span>
    </button>
  )
}

function External({
  name,
  on,
  commit,
}: {
  name: string
  on: boolean
  commit: SheetActions['commit']
}) {
  return (
    <button
      className={classes('xtag', on && 'on')}
      type="button"
      data-act="ext-tag"
      data-item={name}
      aria-pressed={on}
      title={on ? '改回这条线自己做' : '改成外部供应：从别处运来，这条线不做'}
      onClick={() =>
        commit(() => {
          if (state.recipe[name] === 'ext' || state.recipe[name] === 'raw') delete state.recipe[name]
          else state.recipe[name] = 'ext'
        })
      }
    >
      外部
    </button>
  )
}

function CompletedRow({
  name,
  x,
  last,
  sprayed,
  remove,
}: {
  name: string
  x: RecordLine
  last: boolean
  sprayed: boolean
  remove: SheetActions['removeBuilt']
}) {
  const p = x.part
  const r = p?.recipe ? BY_KEY.get(p.recipe) : null
  return (
    <tr className={classes('is-rec', last && 'rec-last')}>
      <td className="c-item">
        <div className="it">
          <Box name={name} cls="done sm" />
          <span className="nm">{name}</span>
        </div>
      </td>
      <td className="c-rate">
        <span className="n">{`−${num(x.rate)}`}</span>
      </td>
      <td className="c-fab">
        {p &&
          (p.count ? (
            <div className="fab">
              <span className="count">
                <b>{p.count}</b>
              </span>
              <span className="cell static">
                {p.machine && (
                  <>
                    <Icon name={p.machine} cls="s24" />
                    <span className="lbl">{shown(p.machine)}</span>
                  </>
                )}
              </span>
            </div>
          ) : x.sameAs ? (
            <span className="same">{`和「${x.sameAs}」同一组设备`}</span>
          ) : null)}
      </td>
      {sprayed && (
        <td className="c-spray">
          <span className="lbl muted">{p && sprayLabel(p.mode)}</span>
        </td>
      )}
      <td className="c-recipe">
        {r && (
          <span className="cell recipe static">
            <RecipeLine r={r} />
          </span>
        )}
      </td>
      <td className="c-ext">
        <span
          className="xtag done rec-tag"
          title={x.parent ? undefined : `在${quote(x.from)}的蓝图里，删那条记录时一起删`}
        >
          <i className="ico i-check" aria-hidden="true" />
          已完成
          {x.parent && (
            <button
              className="rec-x"
              type="button"
              data-act="rec-rm"
              data-i={x.i}
              title="删掉这条记录，这张蓝图里的别的几样一起删"
              aria-label={`删掉${name}的这条已完成记录`}
              onClick={() => remove(x.i)}
            >
              <i className="ico i-x" aria-hidden="true" />
            </button>
          )}
        </span>
      </td>
    </tr>
  )
}

function ProductionRow({
  row,
  res,
  picks,
  actions,
  open,
  menuOpen,
}: {
  row: Row
  res: Result
  picks: Picks
  actions: SheetActions
  open: OpenMenu
  menuOpen: boolean
}) {
  const { name, u, r } = row
  const used = res.usedBy.get(name)
  const tip = used ? `用在：${[...new Set(used)].join('、')}` : ''
  const records = row.recs ?? []
  const hasRec = records.length > 0 && 'has-rec'
  const rate = (
    <td className="c-rate">
      <span className="n">{num(row.need)}</span>
      {row.other > EPS && (
        <small title="别的配方顺带产出的，先用上">{`其中副产 ${num(row.other)}`}</small>
      )}
    </td>
  )
  if (!u || !r)
    return (
      <tr className={classes('is-ext', hasRec)}>
        <td className="c-item">
          <div className="it" title={tip || undefined}>
            <Box name={name} cls="ext" />
            <span className="nm">{name}</span>
          </div>
        </td>
        {rate}
        <td className="c-fab">
          <span className="same">{row.need > EPS ? '从别处运来，这条线不做' : ''}</span>
        </td>
        {res.sp && <td className="c-spray" aria-label="不适用" />}
        <td className="c-recipe" aria-label="不适用" />
        <td className="c-ext">
          {!row.orphan && <External name={name} on commit={actions.commit} />}
        </td>
      </tr>
    )
  const list = PRODUCERS.get(name) ?? []
  const alts = list.filter((v) => !v.source).length + Number(list.some((v) => v.source))
  const inc = picks.inside.get(u)
  const selected = picks.tops.has(u)
  const title = [inc ? `含在${quote(inc.from.map((run) => run.leader))}里，跟着一起做` : '', tip]
    .filter(Boolean)
    .join('\n')
  const style: CSSProperties & { '--d': number } = { '--d': inc?.d ?? 0 }
  const select = () => {
    if (!menuOpen && !document.querySelector('.pill-wrap.open, .menu:not([hidden])'))
      actions.selectItem(name)
  }
  return (
    <tr
      data-item={name}
      className={classes(row.goal && 'is-goal', hasRec, selected && 'sel', !!inc && 'inc')}
      style={style}
      onClick={(e) => {
        if (
          e.target instanceof Element &&
          !e.target.closest('button') &&
          !String(window.getSelection() ?? '')
        )
          select()
      }}
    >
      <td className="c-item">
        <button
          className="it"
          type="button"
          data-act="pick-row"
          data-item={name}
          data-tip={tip}
          title={title}
          aria-pressed={selected}
          onClick={select}
        >
          <Box name={name} />
          <span className="nm">{name}</span>
          {row.goal && <span className="tag">目标</span>}
        </button>
      </td>
      {rate}
      <td className="c-fab">
        {row.first ? (
          <Factory u={u} open={open} />
        ) : (
          <span className="same">{`和「${u.leader}」同一组设备`}</span>
        )}
      </td>
      {res.sp && (
        <td className="c-spray">
          <Spray u={u} open={open} />
        </td>
      )}
      <td className="c-recipe">
        {alts > 1 ? (
          <button
            className={classes('cell recipe', !!state.recipe[name] && 'changed')}
            type="button"
            data-act="recipe"
            data-item={name}
            title="换配方"
            onClick={(e) => open('recipe', name, e.currentTarget)}
          >
            <RecipeLine r={r} />
            <span className="alt">{`${alts} 种`}</span>
          </button>
        ) : (
          <span className="cell recipe static">
            <RecipeLine r={r} />
          </span>
        )}
      </td>
      <td className="c-ext">
        {!row.goal && <External name={name} on={false} commit={actions.commit} />}
      </td>
    </tr>
  )
}

type View = 'fleet' | 'power' | 'raw' | 'spray'
const GENERATORS = [
  ['火力发电厂', 2.16, '台'],
  ['微型聚变发电站', 15, '台'],
  ['人造恒星', 72, '座'],
] as const

function Units({ values, unit }: { values: ReadonlyMap<string, number>; unit?: string }) {
  return (
    <div className="units">
      {[...values].map(([m, n]) => (
        <span className="unit" key={m}>
          <Box name={m} cls="sm" />
          {shown(m)}
          <b>{unit ? num(n) : n}</b>
          {unit && <small>{unit}</small>}
        </span>
      ))}
    </div>
  )
}

function RawMaterials({ res, open }: { res: Result; open: OpenMenu }) {
  if (!res.raw.length) return <p className="cap">不用运原料进来</p>
  const belt = BELTS[state.belt]!
  return (
    <>
      <p className="cap">每分钟要运进来多少（原料和外部供应）</p>
      <div className="rows">
        {res.raw.map((x) => {
          const list = PRODUCERS.get(x.name) ?? []
          const mined = list.find((r) => r.source)
          const from = x.ext ? '外部供应' : (mined && SOURCE[mined.kind]) || '原料'
          const belts = x.bring / belt[1]
          const body = (
            <>
              <Box name={x.name} cls={x.ext ? 'ext' : ''} />
              <span className="nm">{x.name}</span>
              <span className="sub">{`${from}${x.other > EPS ? `，副产抵掉 ${num(x.other)}` : ''}`}</span>
              <span className="v">
                <span className="n">{num(x.bring)}</span>
                {belts >= 0.005 && <small>{`${num(belts)} 条${belt[2]}`}</small>}
              </span>
            </>
          )
          return list.some((r) => !r.source) ? (
            <button
              className="row"
              type="button"
              key={x.name}
              data-act="recipe"
              data-item={x.name}
              title="也可以自己生产：点开换配方"
              onClick={(e) => open('recipe', x.name, e.currentTarget)}
            >
              {body}
            </button>
          ) : (
            <div className="row" key={x.name}>
              {body}
            </div>
          )
        })}
      </div>
    </>
  )
}

function SummaryPanel({ view, res, open }: { view: View; res: Result; open: OpenMenu }) {
  switch (view) {
    case 'fleet':
      return res.fleet.size ? <Units values={res.fleet} /> : <p className="cap">没有要建的设备</p>
    case 'raw':
      return <RawMaterials res={res} open={open} />
    case 'power':
      return (
        <>
          <p className="cap">{`满负荷用电约 ${num(res.power)} MW，按额定功率大约要`}</p>
          <div className="gens">
            {GENERATORS.map(([name, mw, unit]) => {
              const n = res.power / mw
              return (
                <span className="gen" key={name}>
                  <Box name={name} />
                  <span className="gen-t">
                    <span className="k">{name}</span>
                    <span className="v">
                      <b>{Math.ceil(n - 1e-9)}</b>
                      {unit}
                      <small>{n.toFixed(2)}</small>
                    </span>
                  </span>
                </span>
              )
            })}
          </div>
          <p className="cap">各种设备</p>
          <Units values={res.powerBy} unit="MW" />
        </>
      )
    case 'spray':
      return (
        res.sp && (
          <>
            <p className="cap">{`${shown(res.sp.name)}，每种设备每分钟用多少（增产剂自己那条线也算在里面）`}</p>
            <Units values={res.sprayBy} unit="个/分" />
          </>
        )
      )
  }
}

function Summary({ res, open }: { res: Result; open: OpenMenu }) {
  const [view, setView] = useState<View>('fleet')
  const sprayOn = res.sp && res.sprayUse > EPS
  const panel = document.getElementById('tile-panel')
  const stats = document.getElementById('stats')
  const current = view === 'spray' && !sprayOn ? 'fleet' : view
  if (view !== current) setView(current)
  useLayoutEffect(() => {
    panel?.setAttribute('aria-labelledby', `tab-${current}`)
  }, [current, panel])
  if (!stats || !panel || !res.goals.length) return null
  const units = [...res.fleet.values()].reduce((a, b) => a + b, 0)
  const tile = (v: View, label: string, value: string | number, unit: string) => (
    <button
      className="stat"
      type="button"
      role="tab"
      id={`tab-${v}`}
      aria-selected={current === v}
      aria-controls="tile-panel"
      data-act="view"
      data-v={v}
      onClick={() => setView(v)}
    >
      <span className="k">{label}</span>
      <span className="v">
        <b>{value}</b>
        {unit}
      </span>
    </button>
  )
  return (
    <>
      {createPortal(
        <>
          {tile('fleet', '设备数量', units, '台')}
          {tile('power', '用电约', num(res.power), 'MW')}
          {tile('raw', '原料', res.raw.filter((x) => x.bring > EPS).length, '种')}
          {res.sp && sprayOn && tile('spray', shown(res.sp.name), num(res.sprayUse), '个/分')}
        </>,
        stats,
      )}
      {createPortal(<SummaryPanel view={current} res={res} open={open} />, panel)}
    </>
  )
}

function Surplus({ res }: { res: Result }) {
  if (!res.surplus.length) return null
  return (
    <section className="panel block">
      <h3>
        <i className="ico i-alert" aria-hidden="true" />
        多余的副产物
      </h3>
      <p>这些用不完，要运走、存进箱子或烧掉，不然会堵住产线</p>
      <div className="rows">
        {res.surplus.map((x) => (
          <div className="row" key={x.name}>
            <Box name={x.name} />
            <span className="nm">{x.name}</span>
            <span className="sub">{x.from.length ? `做${x.from.join('、')}时顺带的` : ''}</span>
            <span className="v">
              <span className="n">{num(x.amount)}</span>
              <small>每分钟</small>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function setRecipe(id: string, value: string) {
  const first = PRODUCERS.get(id)?.[0]
  if (first && (value === 'raw' ? first.source : !first.source && first.key === value))
    delete state.recipe[id]
  else state.recipe[id] = value
}

function MenuOptions({
  menu,
  res,
  commit,
  close,
}: {
  menu: SheetMenu
  res: Result
  commit: SheetActions['commit']
  close: () => void
}) {
  const { kind, id } = menu
  const item = (
    value: string,
    checked: boolean,
    face: ReactNode,
    change: () => void,
    note = '',
    disabled = false,
  ) => (
    <button
      type="button"
      className="menu-item"
      role="menuitemradio"
      key={value}
      aria-checked={checked}
      data-act={`pick-${kind}`}
      data-v={value}
      disabled={disabled}
      onClick={() => {
        close()
        commit(change)
      }}
    >
      {face}
      {note && <span className="menu-note">{note}</span>}
    </button>
  )
  if (kind === 'recipe') {
    const list = PRODUCERS.get(id) ?? []
    const cur = sourceOf(id)
    const mined = list.find((r) => r.source)
    return (
      <>
        <div className="menu-head">{`${id}从哪来`}</div>
        {list
          .filter((r) => !r.source)
          .map((r) =>
            item(
              r.key,
              cur === r,
              <span className="recipe-line">
                <RecipeLine r={r} />
              </span>,
              () => setRecipe(id, r.key),
              KIND_LABEL[r.kind],
            ),
          )}
        {mined &&
          item(
            'raw',
            !cur,
            <>
              <Icon name={id} cls="s22" />
              原料
            </>,
            () => setRecipe(id, 'raw'),
            `${SOURCE[mined.kind]}，只算每分钟要多少`,
          )}
      </>
    )
  }
  const r = BY_KEY.get(id)
  if (!r) return null
  if (kind === 'machine') {
    const machines = MACHINES[r.kind] ?? []
    const current = res.runs.get(r)?.machine?.[0]
    return (
      <>
        <div className="menu-head">{`这一行用哪种${KIND_LABEL[r.kind]}`}</div>
        {machines.map(([n, speed]) =>
          item(
            n,
            n === current,
            <>
              <Icon name={n} cls="s22" />
              {shown(n)}
            </>,
            () => {
              if (n === state.kind[r.kind]) delete state.machineOf[id]
              else state.machineOf[id] = n
            },
            `速度 ×${speed}${n === state.kind[r.kind] ? '（顶栏）' : ''}`,
          ),
        )}
      </>
    )
  }
  const sp = res.sp
  if (!sp) return null
  const cur = state.sprayOf[id] || ''
  const def = state.spray.mode === 'extra' && !r.noExtra ? '增产' : '加速'
  const sprayItem = (
    value: '' | 'none' | 'extra' | 'speed',
    face: string,
    note = '',
    disabled = false,
  ) =>
    item(
      value,
      cur === value,
      face,
      () => {
        if (value) state.sprayOf[id] = value
        else delete state.sprayOf[id]
      },
      note,
      disabled,
    )
  return (
    <>
      <div className="menu-head">{`这一行的增产剂（${sp.short}）`}</div>
      {sprayItem('', `跟顶栏（${def}）`)}
      {sprayItem('none', '不喷')}
      {sprayItem('speed', '加速', `快 ${sp.speed * 100}%`)}
      {sprayItem(
        'extra',
        '增产',
        r.noExtra ? '这个配方不能增产' : `多 ${sp.extra * 100}%`,
        !!r.noExtra,
      )}
    </>
  )
}

function SheetPopover({
  menu,
  res,
  commit,
  close,
}: {
  menu: SheetMenu
  res: Result
  commit: SheetActions['commit']
  close: () => void
}) {
  useLayoutEffect(() => {
    const box = document.getElementById('menu')
    if (!box) return
    box.hidden = false
    const a = menu.anchor.getBoundingClientRect()
    box.style.left = `${Math.max(8, Math.min(a.left, window.innerWidth - box.offsetWidth - 8))}px`
    box.style.top = `${a.bottom + 4 + box.offsetHeight > innerHeight - 8 ? Math.max(8, a.top - box.offsetHeight - 4) : a.bottom + 4}px`
    ;(
      box.querySelector<HTMLButtonElement>('[aria-checked="true"]') ?? box.querySelector('button')
    )?.focus({ preventScroll: true })
    function outside(e: Event) {
      if (
        e.type === 'click' &&
        e.target instanceof Element &&
        e.target.closest('[data-act="recipe"], [data-act="machine"], [data-act="spray"]')
      )
        return
      if (e.target instanceof Node && !box?.contains(e.target) && !menu.anchor.contains(e.target))
        close()
    }
    function escape(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      close()
      menu.anchor.focus({ preventScroll: true })
    }
    document.addEventListener('click', outside)
    document.addEventListener('contextmenu', outside)
    document.addEventListener('keydown', escape)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close)
    return () => {
      box.hidden = true
      document.removeEventListener('click', outside)
      document.removeEventListener('contextmenu', outside)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close)
    }
  }, [menu, close])
  const box = document.getElementById('menu')
  return (
    box && createPortal(<MenuOptions menu={menu} res={res} commit={commit} close={close} />, box)
  )
}

export function Sheet({ res, actions }: { res: Result; actions: SheetActions }) {
  const table = useRef<HTMLTableElement>(null)
  const [menu, setMenu] = useState<(SheetMenu & { res: Result }) | null>(null)
  if (menu && menu.res !== res) setMenu(null)
  const close = useCallback(() => setMenu(null), [])
  const open: OpenMenu = (kind, id, anchor) =>
    setMenu((m) => (m?.anchor === anchor ? null : { kind, id, anchor, res }))
  const picks = pickOf(res)
  const hasGoals = res.goals.length > 0
  const complete = hasGoals && res.goals.every((g) => (res.rem ?? res).full.has(g.name))
  const canArchive = active > 0
  useLayoutEffect(() => {
    const done = document.getElementById('sheet-done')
    const archive = done?.querySelector<HTMLButtonElement>('.archive-btn')
    const summary = document.getElementById('summary')
    if (summary) summary.hidden = !hasGoals
    if (done) done.hidden = !complete
    if (archive) archive.hidden = !canArchive
  }, [complete, hasGoals, canArchive])
  useLayoutEffect(() => {
    const list = table.current
    const panel = list?.parentElement
    const body = document.getElementById('body')
    if (!list || !panel || !body) return
    const fit = () => {
      list.classList.remove('cards')
      list.classList.toggle('cards', body.clientWidth <= 660 || list.scrollWidth > panel.clientWidth)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(body)
    window.addEventListener('resize', fit)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [res])
  return (
    <>
      <Summary res={res} open={open} />
      {!hasGoals ? (
        <div className="panel empty">
          <p>先选一个想做的东西，再填每分钟要多少个</p>
          <div className="quick">
            {QUICK.map((n) => (
              <button
                type="button"
                key={n}
                data-act="quick"
                data-item={n}
                onClick={() => actions.quickGoal(n)}
              >
                <Box name={n} cls="sm" />
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {!!res.rows.length && (
            <section className="panel">
              <table ref={table} className="list">
                <thead>
                  <tr>
                    <th className="c-item">物品</th>
                    <th className="c-rate">每分钟</th>
                    <th className="c-fab">设备数量</th>
                    {res.sp && <th className="c-spray">增产剂</th>}
                    <th className="c-recipe">配方</th>
                    <th className="c-ext">
                      <span className="sr">外部供应</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {res.rows.map((row) => (
                    <Fragment key={row.name}>
                      <ProductionRow
                        row={row}
                        res={res}
                        picks={picks}
                        actions={actions}
                        open={open}
                        menuOpen={!!menu}
                      />
                      {row.recs?.map((x, i, records) => (
                        <CompletedRow
                          key={`${x.i}-${i}`}
                          name={row.name}
                          x={x}
                          last={i === records.length - 1}
                          sprayed={!!res.sp}
                          remove={actions.removeBuilt}
                        />
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          <Surplus res={res} />
        </>
      )}
      {menu && <SheetPopover menu={menu} res={res} commit={actions.commit} close={close} />}
    </>
  )
}
