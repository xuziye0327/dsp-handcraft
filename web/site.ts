import { readFileSync } from 'node:fs'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ABOUT, TIPS } from './faq.js'
import type { Language, PageKind } from './sections.js'
import { AboutSection, TipsBody } from './sections.js'

export const SITE = 'https://dspbp.com/'
export const LANGUAGES = ['zh', 'en'] as const
const other = (l: Language) => (l === 'zh' ? 'en' : 'zh')
const langTag = (l: Language) => (l === 'zh' ? 'zh-CN' : 'en')
const locale = (l: Language) => (l === 'zh' ? 'zh_CN' : 'en_US')
interface Metadata {
  path: string
  name: string
  title: string
  description: string
}
type Pages = Record<Language, Metadata>
const GEN: Pages = {
  zh: {
    path: '',
    name: '戴森球计划蓝图生成器',
    title: '戴森球计划蓝图生成器 · 产线自动排布',
    description:
      '戴森球计划产线蓝图生成器：选好目标产物和每分钟产量，自动排出手搓风格的产线蓝图（每种物品走自己的带，工厂分行、行间夹传送带通道），复制后贴进游戏。在浏览器里运行，不用安装。',
  },
  en: {
    path: 'en/',
    name: 'DSP Blueprint Generator',
    title: 'DSP Blueprint Generator · Dyson Sphere Program',
    description:
      'Pick a product and a rate per minute and get a Dyson Sphere Program production-line blueprint, laid out the way players build by hand. Free, in your browser.',
  },
}
const CALC: Pages = {
  zh: {
    path: 'calc/',
    name: '戴森球计划量产计算器',
    title: '戴森球计划量产计算器 · 产线配比',
    description:
      '戴森球计划量产计算器：选目标物品和每分钟产量，算出每种设备要几台、要多少原料；点「生成蓝图」接着排成手搓风格的产线蓝图，也能出无带流蓝图，复制后贴进游戏。在浏览器里运行，不用安装。',
  },
  en: {
    path: 'en/calc/',
    name: 'DSP Production Calculator',
    title: 'DSP Production Calculator · Dyson Sphere Program',
    description:
      'Pick target items and a rate per minute, calculate buildings and raw materials, then turn the line into a blueprint you can paste into the game. Free, in your browser.',
  },
}
const tipsMeta = (lang: Language) => ({
  ...GEN[lang],
  path: `${GEN[lang].path}tips/`,
  name: TIPS[lang].name,
  title: TIPS[lang].title,
  description: TIPS[lang].description,
})
const TIPS_PAGES: Pages = { zh: tipsMeta('zh'), en: tipsMeta('en') }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const url = (pages: Pages, lang: Language) => SITE + pages[lang].path
function alternates(pages: Pages, xml = false) {
  const tag = xml ? 'xhtml:link' : 'link'
  const end = xml ? '/>' : '>'
  return [
    ...LANGUAGES.map(
      (lang) =>
        `<${tag} rel="alternate" hreflang="${langTag(lang)}" href="${url(pages, lang)}"${end}`,
    ),
    `<${tag} rel="alternate" hreflang="x-default" href="${url(pages, 'en')}"${end}`,
  ]
}
function headTags(pages: Pages, lang: Language) {
  const p = pages[lang]
  const og = {
    type: 'website',
    site_name: GEN[lang].name,
    title: p.title,
    description: p.description,
    url: url(pages, lang),
    locale: locale(lang),
    'locale:alternate': locale(other(lang)),
  }
  return [
    `<meta name="description" content="${esc(p.description)}">`,
    `<link rel="canonical" href="${url(pages, lang)}">`,
    ...alternates(pages),
    ...Object.entries(og).map(
      ([key, value]) => `<meta property="og:${key}" content="${esc(value)}">`,
    ),
    '<meta name="twitter:card" content="summary">',
  ].join('\n')
}
function faqSchema(items: { q: string; a: string[] }[], lang: Language) {
  const plain = (s: string) => s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1')
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: langTag(lang),
    mainEntity: items.map((x) => ({
      '@type': 'Question',
      name: x.q,
      acceptedAnswer: { '@type': 'Answer', text: x.a.map(plain).join(lang === 'en' ? ' ' : '') },
    })),
  }
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
}
export function substitute(page: string, marker: string, content: string) {
  if (!page.includes(marker)) throw new Error(`Missing template marker: ${marker}`)
  return page.replace(marker, () => content)
}
function localize(page: string, lang: Language, kind: PageKind, icon: string, alternate: string) {
  const pages = kind === 'gen' ? GEN : CALC
  const otherLang = other(lang)
  const html = `<html lang="${langTag(lang)}" data-${otherLang}-title="${esc(pages[otherLang].title)}"`
  return substitute(
    substitute(
      substitute(page, "/*__LANG__*/'auto'", JSON.stringify(lang)),
      '/*__ALT__*/null',
      JSON.stringify({ lang: otherLang, href: alternate }),
    ),
    '<!--__ABOUT__-->',
    `${renderToStaticMarkup(createElement(AboutSection, { kind, lang }))}\n${faqSchema(ABOUT[kind][lang].faq, lang)}`,
  )
    .replace('<html lang="zh-CN"', html)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(pages[lang].title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">\s*/, '')
    .replace(
      '<link rel="icon" href="favicon.ico">',
      () => `<link rel="icon" href="${icon}">\n${headTags(pages, lang)}`,
    )
}
export function sitePage(page: string, lang: Language) {
  const up = lang === 'en' ? '../' : ''
  return substitute(
    localize(page, lang, 'gen', `${up}favicon.ico`, lang === 'en' ? '../' : 'en/'),
    "/*__ROOT__*/''",
    JSON.stringify(up),
  )
}
export function calcPage(page: string, lang: Language) {
  const en = lang === 'en'
  let html = localize(
    page,
    lang,
    'calc',
    `${en ? '../../' : '../'}favicon.ico`,
    en ? '../../calc/' : '../en/calc/',
  )
  html = substitute(html, "/*__GEN__*/'generator.html'", JSON.stringify('../index.html'))
  if (en)
    html = html.replace(
      /(src="|href="|url\()((?:dsq-data|calc-icons|calc)\.(?:js|avif|webp))(?=[")])/g,
      '$1../../calc/$2',
    )
  return html
    .replace(
      '<img class="logo" src="favicon.ico"',
      `<img class="logo" src="${en ? '../../' : '../'}favicon.ico"`,
    )
    .replace('href="tips/index.html" id="tips-link"', 'href="../tips/index.html" id="tips-link"')
}
const css = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')
export function tipsPage(lang: Language, script: string) {
  const t = TIPS[lang]
  const icon = `${lang === 'en' ? '../../' : '../'}favicon.ico`
  const items = t.groups.flatMap((group) => group.items)
  return [
    '<!doctype html>',
    `<html lang="${langTag(lang)}"><head><meta charset="utf-8">`,
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${esc(t.title)}</title><link rel="icon" href="${icon}">`,
    headTags(TIPS_PAGES, lang),
    `<style>${css('tips.css')}</style><style class="dark-css" media="(prefers-color-scheme: dark)">${css('tips-dark.css')}</style>`,
    `<script>${script}</script>`,
    faqSchema(items, lang),
    '</head><body>',
    renderToStaticMarkup(createElement(TipsBody, { lang, generatorName: GEN[lang].name, icon })),
    '</body></html>',
  ].join('\n')
}
export const sitemap = () =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...[GEN, CALC, TIPS_PAGES].flatMap((pages) =>
      LANGUAGES.map(
        (l) =>
          `  <url>\n    <loc>${url(pages, l)}</loc>\n    ${alternates(pages, true).join('\n    ')}\n  </url>`,
      ),
    ),
    '</urlset>',
    '',
  ].join('\n')
export const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`
