// Optional DSQ host integration for the embeddable generator. The icon atlas already
// contains item names, so there is no need to execute the host's Scripts/data.js.
import { GAME_ITEM_IDS } from '../src/beltless/ids.js'

interface IconEntry {
  name: string
  value: string
}
const icons = new Map<string | number, string>()
const ids: Record<string, number> = GAME_ITEM_IDS
window.DSPHC = { icon: ({ id, name }) => icons.get(id) ?? icons.get(name) }
async function loadIcons() {
  try {
    const res = await fetch('../Scripts/data.json')
    if (!res.ok) return
    const data: { icons1?: IconEntry[]; icons2?: IconEntry[] } = await res.json()
    for (const entry of [...(data.icons1 ?? []), ...(data.icons2 ?? [])]) {
      const name = entry.name.split('-').slice(2).join('-') || entry.name
      if (icons.has(name)) continue
      const src = `data:image/png;base64,${entry.value}`
      icons.set(name, src)
      if (ids[name] && !icons.has(ids[name])) icons.set(ids[name], src)
    }
    window.dispatchEvent(new Event('dsphc-icons'))
  } catch {
    /* Local copies can use the built-in line art. */
  }
}
void loadIcons()
window.addEventListener('dsphc-done', (event) => {
  if (window.parent === window || !(event instanceof CustomEvent)) return
  const { targets = [], ok, kind = null, made = null } = event.detail ?? {}
  window.parent.postMessage({ type: 'dsphc-done', targets, ok: Boolean(ok), kind, made }, '*')
})
document.addEventListener(
  'DOMContentLoaded',
  () => {
    const bar = document.createElement('div')
    bar.style.cssText =
      'display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:8px 16px;font-size:13px;background:#1d3557;color:#e8eef6'
    const back = document.createElement('a')
    back.href = '../'
    back.style.cssText = 'color:inherit;text-decoration:none'
    back.textContent = '← 返回量产量化计算器'
    if (parent !== window)
      back.onclick = (e) => {
        e.preventDefault()
        parent.postMessage('dsphc-close', '*')
      }
    const credit = document.createElement('span')
    const repo = document.createElement('a')
    repo.href = 'https://github.com/zoujack018/dsp-handcraft'
    repo.target = '_blank'
    repo.rel = 'noopener'
    repo.style.color = 'inherit'
    repo.textContent = 'dsp-handcraft'
    credit.append('蓝图由 ', repo, ' 生成（源码）')
    bar.append(back, credit)
    document.body.prepend(bar)
  },
  { once: true },
)
