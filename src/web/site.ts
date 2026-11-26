import { readFileSync } from 'node:fs'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ABOUT, TIPS } from './faq.js'
import { SPRITE } from './glyphs.ts'
import { AboutSection, TipsBody } from './sections.js'

const site = 'https://dspbp.com/'
const pages = {
  'index.html': { path: '', title: '戴森球计划蓝图生成器 · 产线自动排布', kind: 'gen' },
  'calc/index.html': { path: 'calc/', title: '戴森球计划量产计算器 · 产线配比', kind: 'calc' },
  'tips/index.html': { path: 'tips/', title: TIPS.title, kind: 'tips' },
} as const
const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

function faqSchema(items: { q: string; a: string[] }[]) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: 'zh-CN',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a.join('').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1'),
      },
    })),
  }
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
}

export function renderPage(html: string, name: string) {
  if (!Object.hasOwn(pages, name)) return html
  const { path, title, kind } = pages[name as keyof typeof pages]
  const description = kind === 'tips' ? TIPS.description : ABOUT[kind].lead[0]
  const metadata = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}">`,
    `<link rel="canonical" href="${site}${path}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    `<meta property="og:url" content="${site}${path}">`,
    '<meta property="og:locale" content="zh_CN">',
  ].join('\n')
  html = html.replace('<!--__META__-->', () => metadata)
  if (kind === 'tips') {
    const css = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8')
    return html
      .replace(
        '<!--__TIPS_CSS__-->',
        () =>
          `<style>${css('tips.css')}</style>\n<style class="dark-css" media="(prefers-color-scheme: dark)">${css('tips-dark.css')}</style>`,
      )
      .replace('<!--__FAQ_SCHEMA__-->', () => faqSchema(TIPS.groups.flatMap(({ items }) => items)))
      .replace('<!--__TIPS__-->', () =>
        renderToStaticMarkup(createElement(TipsBody, { generatorName: '戴森球计划蓝图生成器' })),
      )
  }
  return html
    .replace('<!--__SPRITE__-->', () => SPRITE)
    .replace(
      '<!--__ABOUT__-->',
      () =>
        `${renderToStaticMarkup(createElement(AboutSection, { kind }))}\n${faqSchema(ABOUT[kind].faq)}`,
    )
}

export const sitemap = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.values(
    pages,
  )
    .map(({ path }) => `  <url><loc>${site}${path}</loc></url>`)
    .join('\n')}\n</urlset>\n`
export const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${site}sitemap.xml\n`
