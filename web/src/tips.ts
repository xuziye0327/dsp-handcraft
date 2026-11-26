import { installTheme } from './theme.js'

installTheme()
document.addEventListener(
  'DOMContentLoaded',
  () => {
    const headings = [...document.querySelectorAll<HTMLElement>('article h3[id]')]
    const toc = document.querySelector<HTMLElement>('.toc')
    if (!toc) return
    const links = new Map(
      [...toc.querySelectorAll<HTMLAnchorElement>('li a')].map((a) => [a.hash.slice(1), a]),
    )
    let active: HTMLAnchorElement | undefined
    function update() {
      let id = ''
      for (const h of headings) {
        if (h.getBoundingClientRect().top >= 160) break
        id = h.id
      }
      const next = links.get(id)
      if (next === active) return
      active?.removeAttribute('aria-current')
      active = next
      if (!active || !toc) return
      active.setAttribute('aria-current', 'true')
      const box = toc.getBoundingClientRect()
      const r = active.getBoundingClientRect()
      if (r.top < box.top + 40 || r.bottom > box.bottom - 40)
        toc.scrollTop += r.top - box.top - box.height / 2
    }
    addEventListener('scroll', update, { passive: true })
    addEventListener('resize', update)
    update()
  },
  { once: true },
)
