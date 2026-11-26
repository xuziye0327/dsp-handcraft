import { blueprintLabel, relabelBlueprint } from '../../../src/codec/relabel.js'
import { FINE } from '../drawing.js'
import { glyphOf, glyphSvg } from '../glyphs.js'
import { esc, type CatalogItem, type ItemIcon } from './shared'
export function createIcons(items: Map<number, CatalogItem>, catalog: CatalogItem[]) {
  const base = `${window.dsphcRoot || ''}icons/`
  let local = false
  function source(x: ItemIcon) {
    const c = x.icon !== undefined ? x : (catalog.find((y) => y.name === x.name) ?? x)
    return (
      (c.id != null ? window.DSPHC?.icon?.({ ...c, id: c.id }) : undefined) ||
      (local && c.icon ? `${base}${c.icon}.png` : '')
    )
  }
  function pic(x: ItemIcon) {
    const src = source(x)
    return (
      (src ? `<img class="gl pic" src="${esc(src)}" alt="" onerror="this.remove()">` : '') +
      glyphSvg(x)
    )
  }
  function drawIcon(id: number) {
    const it = items.get(id)
    if (!it) return null
    const src = source(it)
    if (src) return `<image href="${esc(src)}" x="-0.4" y="-0.4" width="0.8" height="0.8"/>`
    const glyph = glyphOf(it)
    return `<svg x="-0.4" y="-0.4" width="0.8" height="0.8" viewBox="0 0 24 24"><use href="#g-${glyph.id}" style="--fill:${glyph.fill}" stroke="${FINE}" stroke-width="1.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/></svg>`
  }
  return {
    pic,
    drawIcon,
    toolbar(id: number) {
      const it = items.get(id)
      return it && (local || source(it)) ? pic(it) : null
    },
    start(refresh: () => void) {
      window.addEventListener('dsphc-icons', refresh)
      if (window.DSPHC) return
      const probe = new Image()
      probe.onload = () => {
        local = true
        refresh()
      }
      probe.src = base + 'iron-ore.png'
    },
  }
}
export function outBlueprint(s: string) {
  const tr = window.dsphcTr
  if (!tr) return s
  const label = blueprintLabel(s)
  if (!label) return s
  return relabelBlueprint(s, {
    shortDesc: tr(label.shortDesc)
      .replace(/([A-Za-z.)])(\d)/g, '$1 $2')
      .replace(/\s*\+\s*/g, ' + '),
    desc: tr(label.desc),
  })
}
export function switchLanguage() {
  const next = window.dsphcLang === 'en' ? 'zh' : 'en',
    alt = window.dsphcAlt,
    url = new URL(
      alt?.lang === next ? alt.href + location.pathname.split('/').pop() : location.href,
      location.href,
    )
  if (alt?.lang === next) {
    url.search = location.search
    url.hash = location.hash
    if (url.protocol !== 'file:') url.pathname = url.pathname.replace(/\/index\.html$/, '/')
  }
  try {
    localStorage.setItem('dsphc-lang', next)
    url.searchParams.delete('lang')
  } catch {
    url.searchParams.set('lang', next)
  }
  if (url.href === location.href) location.reload()
  else location.replace(url)
}
