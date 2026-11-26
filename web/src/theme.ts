type Theme = 'dark' | 'light'
interface Preference {
  t: Theme
  sys: Theme
}
const key = 'dsphc-theme'

/** An explicit choice lasts until the OS changes appearance. */
export function installTheme() {
  const mq = matchMedia('(prefers-color-scheme: dark)')
  const system = (): Theme => (mq.matches ? 'dark' : 'light')
  let choice: Preference | null = null
  const read = () => {
    try {
      choice = JSON.parse(localStorage.getItem(key) ?? 'null')
    } catch {
      /* Storage is optional. */
    }
  }
  const save = () => {
    try {
      if (choice) localStorage.setItem(key, JSON.stringify(choice))
      else localStorage.removeItem(key)
    } catch {
      /* Use the in-memory choice in this tab. */
    }
  }
  const apply = () => {
    if (choice && (choice.sys !== system() || (choice.t !== 'dark' && choice.t !== 'light'))) {
      choice = null
      save()
    }
    const t = choice?.t
    for (const css of document.querySelectorAll<HTMLStyleElement>('style.dark-css'))
      css.media = t === 'dark' ? 'all' : t === 'light' ? 'not all' : mq.media
    document.documentElement.dataset.theme = t ?? system()
    dispatchEvent(new Event('themechange'))
  }
  window.dsphcTheme = (t) => {
    choice = t === system() ? null : { t, sys: system() }
    save()
    apply()
  }
  mq.addEventListener('change', () => window.dsphcTheme(system()))
  window.addEventListener('storage', (event) => {
    if (event.key === key) {
      read()
      apply()
    }
  })
  read()
  apply()
}
