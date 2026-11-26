import { element } from './display'

/** Bind theme and beltless help controls in the calculator's HTML shell. */
export function bindShell() {
  const controller = new AbortController(),
    options = { signal: controller.signal }
  const theme = element('theme')
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
  const row = element('beltless-help'),
    tip = element('beltless-tip'),
    help = row.querySelector<HTMLButtonElement>('.help-btn')!
  const close = () => {
    row.classList.remove('open')
    help.setAttribute('aria-expanded', 'false')
  }
  const place = () => {
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
