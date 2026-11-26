import type { CSSProperties } from 'react'

import { ICON_AT, ICON_COLS } from './atlas'
import { shown } from './display'
import { ICON_NAME } from './model'

export function Icon({
  name,
  cls = '',
  tip = false,
}: {
  name: string
  cls?: string
  tip?: boolean
}) {
  const i = ICON_AT.get(ICON_NAME[name] || name)
  const props = tip ? { title: shown(name) } : { 'aria-hidden': true as const }
  if (i === undefined)
    return (
      <i className={`ic none ${cls}`} {...props}>
        {shown(name).slice(0, 1)}
      </i>
    )
  return (
    <i
      className={`ic ${cls}`}
      style={{ '--x': i % ICON_COLS, '--y': Math.floor(i / ICON_COLS) } as CSSProperties}
      {...props}
    />
  )
}
export function ItemBox({ name, cls = '' }: { name: string; cls?: string }) {
  return (
    <span className={`ibox ${cls}`}>
      <Icon name={name} cls={cls.includes('sm') ? 's24' : 's28'} />
    </span>
  )
}
export function Cross() {
  return <i className="ico i-x" aria-hidden="true" />
}
