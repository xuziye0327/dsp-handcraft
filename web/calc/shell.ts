import { element } from './display'

function switchLang() {
  const to = window.dsphcLang === 'en' ? 'zh' : 'en'
  const alt = window.dsphcAlt
  const url = new URL(
    alt?.lang === to ? alt.href + location.pathname.split('/').pop() : location.href,
    location.href,
  )
  if (alt?.lang === to) {
    url.search = location.search
    url.hash = location.hash
    if (url.protocol !== 'file:') url.pathname = url.pathname.replace(/\/index\.html$/, '/')
  }
  try {
    localStorage.setItem('dsphc-lang', to)
    url.searchParams.delete('lang')
  } catch {
    url.searchParams.set('lang', to)
  }
  if (url.href === location.href) location.reload()
  else location.replace(url)
}

/** Site-owned header/footer remain in the HTML so the site builder can localize their URLs and metadata. */
export function bindShell() {
  const controller = new AbortController(),
    options = { signal: controller.signal }
  const theme = element('theme'),
    lang = element('lang-btn')
  const renderTheme = () => {
    const dark = document.documentElement.dataset.theme === 'dark'
    theme.querySelector('i')!.className = `ico ${dark ? 'i-sun' : 'i-moon'}`
    theme.querySelector('span')!.textContent = dark ? '浅色模式' : '深色模式'
    theme.title = `换成${dark ? '浅色' : '深色'}；平常跟系统，系统自己换深浅色时又跟系统`
  }
  renderTheme()
  window.addEventListener('themechange', renderTheme, options)
  theme.addEventListener(
    'click',
    () => window.dsphcTheme?.(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'),
    options,
  )
  const en = window.dsphcLang === 'en'
  lang.textContent = en ? '中文' : 'English'
  lang.lang = en ? 'zh-CN' : 'en'
  lang.addEventListener('click', switchLang, options)

  const row = element('beltless-help'),
    tip = element('beltless-tip'),
    help = row.querySelector<HTMLButtonElement>('.help-btn')!
  const close = () => {
    row.classList.remove('open')
    help.setAttribute('aria-expanded', 'false')
  }
  const place = () => {
    window.dsphcFlush?.()
    row.classList.remove('up')
    tip.style.cssText = 'display:block;visibility:hidden'
    const r = row.getBoundingClientRect(),
      t = tip.getBoundingClientRect(),
      side = row.closest('.side')!
    const bounds =
      getComputedStyle(side).overflowY === 'visible'
        ? { top: 0, bottom: innerHeight }
        : side.getBoundingClientRect()
    row.classList.toggle(
      'up',
      t.bottom > Math.min(innerHeight, bounds.bottom) - 8 &&
        r.top - t.height - 8 >= Math.max(0, bounds.top) + 8,
    )
    tip.style.cssText = ''
  }
  help.addEventListener('pointerenter', place, options)
  help.addEventListener('focus', place, options)
  help.addEventListener(
    'click',
    () => {
      place()
      help.setAttribute('aria-expanded', String(row.classList.toggle('open')))
    },
    options,
  )
  document.addEventListener(
    'click',
    (e) => {
      if (e.target instanceof Node && !help.contains(e.target)) close()
    },
    options,
  )
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') close()
    },
    options,
  )
  return () => controller.abort()
}
