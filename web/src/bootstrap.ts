// Runs in <head>, before either app paints. Both pages share language and theme choices.
import { installTheme } from './theme.js'

const { documentElement: html } = document
const zhUser = (
  navigator.languages.length ? navigator.languages : [navigator.language || 'zh']
).some((l) => /^zh\b/i.test(l))
let preference = new URLSearchParams(location.search).get('lang')
try {
  preference ||= localStorage.getItem('dsphc-lang')
} catch {
  /* Standalone files may not have access to storage. */
}
const chosen = preference === 'en' || preference === 'zh'
const lang =
  preference === 'en' || preference === 'zh'
    ? preference
    : window.dsphcDefaultLang === 'auto'
      ? zhUser
        ? 'zh'
        : 'en'
      : window.dsphcDefaultLang
window.dsphcLang = lang
if (window.parent !== window) html.classList.add('in-frame')
if (lang === 'en') {
  if (html.lang !== 'en') document.title = html.dataset.enTitle || document.title
  html.lang = 'en'
  html.classList.add('i18n-wait')
  addEventListener('load', () => setTimeout(() => html.classList.remove('i18n-wait'), 1500), {
    once: true,
  })
} else if (html.lang === 'en') {
  html.lang = 'zh-CN'
  document.title = html.dataset.zhTitle || document.title
}
window.dsphcLangHint =
  !chosen && lang === 'zh' && !zhUser && window.dsphcAlt?.lang === 'en' && window.parent === window
if (window.dsphcLangHint)
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      const tip = document.createElement('div')
      tip.id = 'lang-hint'
      tip.lang = 'en'
      tip.setAttribute('role', 'region')
      tip.setAttribute('aria-label', 'Language')
      tip.dataset.i18n = 'off'
      tip.dataset.nosnippet = ''
      tip.style.cssText =
        'position:fixed;left:16px;right:16px;bottom:24px;z-index:3000;width:fit-content;margin:0 auto;display:flex;align-items:center;gap:14px;padding:10px 10px 10px 16px;font:13px/18px system-ui,sans-serif;color:#ededef;background:#2a2a2d;border:1px solid #555;border-radius:10px;box-shadow:0 12px 32px #0005'
      const switcher = document.createElement('button')
      switcher.type = 'button'
      switcher.textContent = 'Switch to English'
      switcher.style.cssText =
        'font:inherit;border:0;border-radius:6px;padding:6px 12px;color:#1a1206;background:#f0913a;cursor:pointer'
      switcher.onclick = () => document.getElementById('lang-btn')?.click()
      const dismiss = document.createElement('button')
      dismiss.type = 'button'
      dismiss.textContent = '×'
      dismiss.setAttribute('aria-label', 'Dismiss')
      dismiss.title = 'Dismiss'
      dismiss.style.cssText = 'border:0;background:none;color:inherit;cursor:pointer'
      dismiss.onclick = () => {
        try {
          localStorage.setItem('dsphc-lang', 'zh')
        } catch {
          /* Storage is optional. */
        }
        tip.remove()
      }
      tip.append('This page is in Chinese.', switcher, dismiss)
      document.body.append(tip)
    },
    { once: true },
  )

installTheme()
