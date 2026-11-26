// Resolve the standalone calculator relative to the generator document.
const embedded = window.parent !== window
const home = new URL('calc/index.html', location.href)
if (home.protocol !== 'file:') home.pathname = home.pathname.replace(/\/index\.html$/, '/')

interface DoneDetail {
  targets?: unknown[]
  ok?: boolean
  kind?: string
  made?: unknown
}
window.addEventListener('dsphc-done', (e) => {
  if (!embedded || !(e instanceof CustomEvent)) return
  const d: DoneDetail = e.detail || {}
  window.parent.postMessage(
    {
      type: 'dsphc-done',
      targets: d.targets || [],
      ok: !!d.ok,
      kind: d.kind || null,
      made: d.made || null,
    },
    '*',
  )
})
function addReturnLink() {
  const bar = document.createElement('div')
  bar.style.cssText =
    'display:flex;align-items:center;padding:8px 16px;font-size:13px;background:#1d3557;color:#e8eef6'
  const link = document.createElement('a')
  link.style.cssText = 'color:inherit;text-decoration:none'
  link.textContent = '← 返回计算器'
  link.href = home.href
  if (embedded)
    link.addEventListener('click', (e) => {
      e.preventDefault()
      window.parent.postMessage('dsphc-close', '*')
    })
  bar.append(link)
  document.body.prepend(bar)
}
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', addReturnLink, { once: true })
else addReturnLink()

export {}
