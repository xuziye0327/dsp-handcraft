import { useState, type ReactNode } from 'react'

import { groups, type OptionName } from './options'
import { labStack, limitValue, valueOf, type Settings } from './settings'
export interface OptionProps {
  state: Settings
  choose: (k: OptionName, v: string) => void
}
const shortLabels: Record<string, string> = {
  小型储物仓: '小型仓',
  大型储物仓: '大型仓',
  放在仓顶: '放仓顶',
}
const fieldIds = new Set(['supply', 'dist', 'fracengine', 'warper'])
function Limit({ name, state, choose }: OptionProps & { name: 'maxwidth' | 'maxheight' }) {
  const current = state[name],
    preset = groups[name].choices.some((c) => c.value === current),
    own = preset ? '' : current
  const label = groups[name].title
  const [editing, setDraft] = useState<string | null>(null)
  const draft = editing ?? (own || '0')
  const commit = () => {
    const v = limitValue(draft)
    setDraft(null)
    if (editing !== null) choose(name, v)
  }
  return (
    <label className="limit-own">
      <input
        type="radio"
        name={name}
        data-own=""
        checked={!preset}
        value={own}
        onChange={() => choose(name, own)}
      />
      <input
        type="number"
        className="limit-num"
        min="0"
        max="9999"
        step="1"
        inputMode="numeric"
        value={draft}
        aria-label={`${label}，自己填（0 是不限）`}
        title="0 是不限，也可以填别的数"
        onClick={() => {
          if (preset) choose(name, own)
        }}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
        onBlur={commit}
      />
    </label>
  )
}
function Field({ name, hidden, ...p }: OptionProps & { name: OptionName; hidden?: boolean }) {
  const { title, choices, hint } = groups[name],
    v = valueOf(p.state, name),
    limit = name === 'maxwidth' || name === 'maxheight'
  return (
    <fieldset
      className="seg"
      data-name={name}
      id={fieldIds.has(name) ? `${name}-field` : undefined}
      hidden={hidden}
    >
      <legend>{title}</legend>
      <div className="opts">
        {limit && <Limit {...p} name={name} />}
        {choices.map((c) => (
          <label key={c.value} hidden={c.hidden}>
            <input
              type="radio"
              name={name}
              value={c.value}
              checked={v === c.value}
              onChange={() => p.choose(name, c.value)}
            />
            <span data-pill={c.pill} data-note={c.note} data-short={shortLabels[c.text]}>
              {c.text}
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="hint">{hint}</p>}
      <label className="modern-option">
        <span>{title}</span>
        <select
          data-option-select={name}
          aria-label={title}
          value={v}
          onChange={(e) => p.choose(name, e.currentTarget.value)}
        >
          {limit && <option value={choices.some((c) => c.value === v) ? '' : v}>{v || '0'}</option>}
          {choices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.text}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  )
}
function LabHeight({ state, onHeight }: { state: Settings; onHeight: (n: number) => void }) {
  const [height, setHeight] = useState(String(state.labstack))
  return (
    <div className="field labstack">
      <label htmlFor="labstack">研究站最多叠几层</label>
      <span className="rate">
        <input
          type="number"
          id="labstack"
          min="1"
          max="15"
          step="1"
          inputMode="numeric"
          value={height}
          onChange={(e) => {
            setHeight(e.target.value)
            onHeight(labStack(e.target.value))
          }}
          onBlur={() => setHeight(String(state.labstack))}
        />
        <span>层</span>
      </span>
      <p className="hint">「垂直建造」1～6 级：5、7、9、11、13、15 层</p>
    </div>
  )
}
export function SettingsForm({
  state,
  choose,
  goals,
  actions,
  submit,
  beltless,
  onHeight,
}: OptionProps & {
  goals: ReactNode
  actions: ReactNode
  submit: () => void
  beltless: boolean
  onHeight: (n: number) => void
}) {
  const connected = !!state.station,
    boxed = !connected && !!state.supply
  const field = (name: OptionName, hidden = false) => (
    <Field key={name} state={state} choose={choose} name={name} hidden={hidden} />
  )
  return (
    <form
      className="side spec"
      id="spec"
      noValidate
      aria-label="目标和设置"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {goals}
      {field('effort', beltless)}
      {actions}
      {field('supply', !boxed)}
      {field('dist', !boxed)}
      {field(
        'fracengine',
        !(state.recipes[1121] === 115 && state.targets.some((t) => t.id === 1121)),
      )}
      {field('warper', !connected)}
      {field('chemwide')}
      <LabHeight state={state} onHeight={onHeight} />
      {field('maxwidth')}
      {field('maxheight')}
      {field('aspect')}
      {(
        [
          'assembler',
          'smelter',
          'chemical',
          'lab',
          'belt',
          'sorter',
          'logistics',
          'station',
          'power',
          'spray',
          'pilertech',
          'pile',
        ] as const
      ).map((name) => field(name, true))}
    </form>
  )
}
