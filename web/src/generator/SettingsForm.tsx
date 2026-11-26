import { useState, type ReactNode } from 'react'

import { groups, type OptionName } from './options'
import { labStack, limitValue, valueOf, type Settings } from './settings'
import { tr } from './shared'
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
        aria-label={tr(`${label}，自己填（0 是不限）`)}
        title={tr('0 是不限，也可以填别的数')}
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
      <legend>{tr(title)}</legend>
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
            <span
              data-pill={c.pill}
              data-note={c.note && tr(c.note)}
              data-short={shortLabels[c.text] && tr(shortLabels[c.text])}
            >
              {tr(c.text)}
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="hint">{tr(hint)}</p>}
      <label className="modern-option">
        <span>{tr(title)}</span>
        <select
          data-option-select={name}
          aria-label={tr(title)}
          value={v}
          onChange={(e) => p.choose(name, e.currentTarget.value)}
        >
          {limit && <option value={choices.some((c) => c.value === v) ? '' : v}>{v || '0'}</option>}
          {choices.map((c) => (
            <option key={c.value} value={c.value}>
              {tr(c.text)}
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
      <label htmlFor="labstack">{tr('研究站最多叠几层')}</label>
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
        <span>{tr('层')}</span>
      </span>
      <p className="hint">{tr('「垂直建造」1～6 级：5、7、9、11、13、15 层')}</p>
    </div>
  )
}
export function SettingsForm({
  state,
  choose,
  goals,
  actions,
  submit,
  changeLanguage,
  beltless,
  onHeight,
}: OptionProps & {
  goals: ReactNode
  actions: ReactNode
  submit: () => void
  changeLanguage: () => void
  beltless: boolean
  onHeight: (n: number) => void
}) {
  const connected = !!state.station,
    boxed = !connected && !!state.supply
  const field = (name: OptionName, hidden = false) => (
    <Field key={name} state={state} choose={choose} name={name} hidden={hidden} />
  )
  const en = window.dsphcLang === 'en'
  return (
    <form
      className="side spec"
      id="spec"
      noValidate
      aria-label={tr('目标和设置')}
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
      <div className="lang-row" data-i18n="off">
        <button
          type="button"
          className="lang-btn"
          id="lang-btn"
          lang={en ? 'zh-CN' : 'en'}
          onClick={changeLanguage}
        >
          {en ? '中文' : 'English'}
        </button>
      </div>
    </form>
  )
}
