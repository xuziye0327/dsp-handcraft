import { FINE } from '../drawing.js'
import { glyphOf, glyphSvg } from '../glyphs.js'
import { esc, type CatalogItem, type ItemIcon } from './shared'
export function createIcons(items: Map<number, CatalogItem>, catalog: CatalogItem[]) {
  const base = 'icons/'
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
