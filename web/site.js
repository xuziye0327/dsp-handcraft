// 公开网站（发布副本放在 GitHub Pages 上）：蓝图生成器中文在根目录、英文在 en/，量产计算器中文在 calc/、英文在 en/calc/。
// 打包时（tools/build-web.js、发布副本的 web/build.js）给页面头上加搜索引擎和分享卡片看的标签（canonical、互相指的 hreflang、description、Open Graph），
// 标题换成带游戏名的，默认语言写死成这个入口的（中文入口不跟浏览器语言走：搜索引擎的抓取器自称英文浏览器，跟着走的话 / 和 /en/ 抓到的是同一份英文；
// 英文浏览器在中文入口看到的是页面开头那段脚本给的一条提示）。英文那份 lang 也写死英文。页面底下再放一段这个入口语言的简介和常见问题（内容在 web/faq.js），
// 带 FAQPage 结构化数据。计算器只有发布副本打包（calcPage）。嵌进 DSQ 的那份不经过这里。
import { ABOUT, TIPS } from './faq.js';

export const SITE = 'https://dspbp.com/';
const IMG = { w: 2880, h: 1800 }; // 发布副本 img/ 里的截图

const GEN = {
  zh: {
    path: '',
    hreflang: 'zh-CN',
    locale: 'zh_CN',
    name: '戴森球计划蓝图生成器',
    title: '戴森球计划蓝图生成器 · 产线自动排布',
    description: '戴森球计划产线蓝图生成器：选好目标产物和每分钟产量，自动排出手搓风格的产线蓝图（每种物品走自己的带，工厂分行、行间夹传送带通道），复制后贴进游戏。在浏览器里运行，不用安装。',
    image: 'img/screenshot-zh.webp',
    imageAlt: '蓝图生成器：引力矩阵 60/分',
  },
  en: {
    path: 'en/',
    hreflang: 'en',
    locale: 'en_US',
    name: 'DSP Blueprint Generator',
    title: 'DSP Blueprint Generator · Dyson Sphere Program',
    description: 'Pick a product and a rate per minute and get a Dyson Sphere Program production-line blueprint, laid out the way players build by hand. Free, in your browser.',
    image: 'img/screenshot-en.webp',
    imageAlt: 'The generator with a Gravity Matrix 60/min line',
  },
};
const CALC = {
  zh: {
    path: 'calc/',
    hreflang: 'zh-CN',
    locale: 'zh_CN',
    name: '戴森球计划量产计算器',
    title: '戴森球计划量产计算器 · 产线配比',
    description: '戴森球计划量产计算器：选目标物品和每分钟产量，算出每种设备要几台、要多少原料；点「生成蓝图」接着排成手搓风格的产线蓝图，也能出无带流蓝图，复制后贴进游戏。在浏览器里运行，不用安装。',
    image: 'img/calc-zh.webp',
    imageAlt: '量产计算器：绿矩阵（引力矩阵）60/分的生产清单',
  },
  en: {
    path: 'en/calc/',
    hreflang: 'en',
    locale: 'en_US',
    name: 'DSP Production Calculator',
    title: 'DSP Production Calculator · Dyson Sphere Program',
    description: 'Dyson Sphere Program production calculator: pick target items and a rate per minute to see how many of each building and how much raw material you need, then turn the line into a blueprint you can paste into the game. Free, in your browser.',
    image: 'img/calc-en.webp',
    imageAlt: 'The calculator with a Gravity Matrix 60/min production list',
  },
};
// 游戏机制实测：单独一页（中文 tips/、英文 en/tips/，内容在 web/faq.js 的 TIPS，tipsPage 出整页）
const TIPS_PAGES = Object.fromEntries(
  ['zh', 'en'].map((l) => [l, { path: l === 'en' ? 'en/tips/' : 'tips/', hreflang: GEN[l].hreflang, locale: GEN[l].locale, name: TIPS[l].name, title: TIPS[l].title, description: TIPS[l].description, image: GEN[l].image, imageAlt: GEN[l].imageAlt }]),
);
const OTHER = { zh: 'en', en: 'zh' };

const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const must = (s, a, b) => {
  if (!s.includes(a)) throw new Error(`没找到要换的「${a}」`);
  return s.replace(a, () => b);
};
const url = (pages, lang) => SITE + pages[lang].path;
const alternates = (pages, tag) =>
  [
    ...Object.keys(pages).map((l) => `<${tag} rel="alternate" hreflang="${pages[l].hreflang}" href="${url(pages, l)}"/>`),
    `<${tag} rel="alternate" hreflang="x-default" href="${url(pages, 'en')}"/>`, // 既不是中文也不是英文的用户：给英文
  ];
/** <html> 标签：这个入口的 lang，另一种语言的标题带在 data-zh-title / data-en-title 上（照记过的选择出另一种语言时，页面开头那段脚本换上） */
const htmlTag = (pages, lang, rest) =>
  lang === 'en' ? `<html lang="en"${rest} data-zh-title="${attr(pages.zh.title)}">` : `<html lang="zh-CN"${rest} data-en-title="${attr(pages.en.title)}">`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g; // 文字里唯一认的标记：[文字](网址)
const rich = (s) => esc(s).replace(LINK, (_, text, href) => `<a href="${href}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`);
const plain = (s) => s.replace(LINK, '$1');
/** FAQPage 结构化数据（一问一答，链接只留文字） */
const faqLd = (items, inLanguage, lang) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  inLanguage,
  mainEntity: items.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a.map(plain).join(lang === 'en' ? ' ' : '') } })),
});
const tipItems = (lang) => TIPS[lang].groups.flatMap((g) => g.items);
const ldScript = (ld) => `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
/**
 * 入口页面底下的简介和常见问题（web/faq.js 里这一页、这种语言的那份），后面跟 FAQPage 结构化数据。
 * 标题的级别：生成器页面没有别的 h1，简介的标题就是 h1；计算器顶栏已经有 h1，这里用 h2。
 */
const about = (kind, pages, lang) => {
  const a = ABOUT[kind][lang];
  const h = kind === 'gen' ? 1 : 2;
  const ld = faqLd(a.faq, pages[lang].hreflang, lang);
  return [
    `<section class="about" lang="${lang === 'en' ? 'en' : 'zh-CN'}" data-i18n="off" aria-labelledby="about-title">`,
    `<h${h} id="about-title">${esc(a.title)}</h${h}>`,
    ...a.lead.map((p) => `<p>${rich(p)}</p>`),
    `<h${h + 1}>${esc(a.faqTitle)}</h${h + 1}>`,
    '<div class="faq">',
    ...a.faq.map((x) => `<details><summary>${esc(x.q)}</summary>${x.a.map((p) => `<p>${rich(p)}</p>`).join('')}</details>`),
    '</div>',
    // 游戏机制实测（只有生成器有）：列出那一页的问题，各自链到那一页上的锚点
    ...(a.tipsTitle
      ? [`<h${h + 1}>${esc(a.tipsTitle)}</h${h + 1}>`, `<p>${rich(a.tipsLead)}</p>`, '<ul class="tips">', ...tipItems(lang).map((x) => `<li><a href="tips/#${x.id}">${esc(x.q)}</a></li>`), '</ul>']
      : []),
    '</section>',
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
  ].join('\n');
};
/** 头上加的标签（og:site_name 是整个网站的名字，用生成器的） */
const headTags = (pages, lang) => {
  const p = pages[lang];
  const o = pages[OTHER[lang]];
  return [
    `<meta name="description" content="${attr(p.description)}">`,
    `<link rel="canonical" href="${url(pages, lang)}">`,
    ...alternates(pages, 'link').map((x) => x.replace('/>', '>')),
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${attr(GEN[lang].name)}">`,
    `<meta property="og:title" content="${attr(p.title || p.name)}">`,
    `<meta property="og:description" content="${attr(p.description)}">`,
    `<meta property="og:url" content="${url(pages, lang)}">`,
    `<meta property="og:image" content="${SITE}${p.image}">`,
    '<meta property="og:image:type" content="image/webp">',
    `<meta property="og:image:width" content="${IMG.w}">`,
    `<meta property="og:image:height" content="${IMG.h}">`,
    `<meta property="og:image:alt" content="${attr(p.imageAlt)}">`,
    `<meta property="og:locale" content="${p.locale}">`,
    `<meta property="og:locale:alternate" content="${o.locale}">`,
    '<meta name="twitter:card" content="summary_large_image">',
  ];
};

/**
 * 网站上蓝图生成器的一个入口：page 是打包好的页面（模板填好脚本），lang 'zh' | 'en'。英文那份放在 en/ 里（文件名同中文那份）：网站图标、icons/ 往上一层找。
 */
export function sitePage(page, lang) {
  const p = GEN[lang];
  const up = lang === 'en' ? '../' : '';
  let s = page;
  s = must(s, '<html lang="zh-CN">', htmlTag(GEN, lang, ''));
  s = must(s, /<title>[^<]*<\/title>/.exec(s)[0], `<title>${attr(p.title)}</title>`);
  s = must(s, "/*__LANG__*/'auto'", `'${lang}'`);
  if (lang === 'en') s = must(s, '<link rel="icon" href="favicon.ico">', '<link rel="icon" href="../favicon.ico">');
  s = must(s, "/*__ROOT__*/''", JSON.stringify(up));
  s = must(s, '/*__ALT__*/null', JSON.stringify({ lang: OTHER[lang], href: lang === 'en' ? '../' : GEN.en.path }));
  s = must(s, '<!--__ABOUT__-->', about('gen', GEN, lang));
  const icon = `<link rel="icon" href="${up}favicon.ico">`;
  return must(s, icon, `${icon}\n${headTags(GEN, lang).join('\n')}`);
}

/**
 * 网站上量产计算器的一个入口：html 是 web/calc/index.html。中文的在 calc/（计算器的脚本、图集都放这里），英文的在 en/calc/，
 * 脚本和图集回 calc/ 找；网站图标在根目录。「生成蓝图」开同语言的生成器（上一层的 index.html），语言按钮在两个入口之间跳。
 */
export function calcPage(html, lang) {
  const p = CALC[lang];
  const up = lang === 'en' ? '../../' : '../'; // 到网站根目录
  const lib = lang === 'en' ? '../../calc/' : ''; // 到 calc/
  let s = html;
  s = must(s, '<html lang="zh-CN" class="boot">', htmlTag(CALC, lang, ' class="boot"'));
  s = must(s, /<title>[^<]*<\/title>/.exec(s)[0], `<title>${attr(p.title)}</title>`);
  s = must(s, "/*__LANG__*/'auto'", `'${lang}'`);
  if (lang === 'en') {
    for (const f of ['dsq-data.js', 'calc-icons.js', 'calc.js']) s = must(s, `<script defer src="${f}"></script>`, `<script defer src="${lib}${f}"></script>`);
    s = must(s, '<link rel="preload" href="calc-icons.avif"', `<link rel="preload" href="${lib}calc-icons.avif"`);
    s = must(s, 'url(calc-icons.webp);', `url(${lib}calc-icons.webp);`);
    s = must(s, 'image-set(url(calc-icons.avif) type("image/avif"), url(calc-icons.webp) type("image/webp"))', `image-set(url(${lib}calc-icons.avif) type("image/avif"), url(${lib}calc-icons.webp) type("image/webp"))`);
  }
  s = must(s, '<img class="logo" src="favicon.ico"', `<img class="logo" src="${up}favicon.ico"`);
  s = must(s, '/*__ALT__*/null', JSON.stringify({ lang: OTHER[lang], href: lang === 'en' ? '../../calc/' : '../en/calc/' }));
  s = must(s, "/*__GEN__*/'generator.html'", JSON.stringify('../index.html'));
  s = must(s, '<!--__ABOUT__-->', about('calc', CALC, lang));
  s = must(s, '<a href="tips/index.html" id="tips-link">', '<a href="../tips/" id="tips-link">'); // 同语言的游戏机制页（/calc/ → /tips/，/en/calc/ → /en/tips/）
  const desc = /<meta name="description" content="[^"]*">\n/.exec(s);
  if (!desc) throw new Error('没找到计算器原来的 description');
  s = s.replace(desc[0], ''); // 换成下面网站的那句
  const icon = '<link rel="icon" href="favicon.ico">';
  return must(s, icon, `<link rel="icon" href="${up}favicon.ico">\n${headTags(CALC, lang).join('\n')}`);
}

/**
 * 网站上「游戏机制小知识」的一页（中文 tips/index.html，英文 en/tips/index.html），整页在这里出，静态文字：
 * 页头是蓝图色的一条（标题、去生成器的按钮、分组），下面左边目录、右边一栏正文；每个问题一个 h3 带锚点（#id，生成器页面底下链过来），
 * 关键数（key）画成图纸上标注尺寸的样子。强调色只用在去生成器的按钮、目录里正读到的那条和正文里的链接。
 * 头上同生成器的标签，FAQPage 结构化数据；颜色同生成器（系统深色时深色；计算器顶栏手动选过的照 dsphc-theme）。
 */
export function tipsPage(lang) {
  const t = TIPS[lang];
  const up = lang === 'en' ? '../../' : '../'; // 到网站根目录
  const other = lang === 'en' ? '../../tips/' : '../en/tips/';
  const items = tipItems(lang);
  const otherLang = `hreflang="${GEN[OTHER[lang]].hreflang}" lang="${OTHER[lang] === 'en' ? 'en' : 'zh-CN'}"`;
  const links = `<a href="../">${esc(t.nav.gen)}</a><a href="../calc/">${esc(t.nav.calc)}</a><a href="${other}" ${otherLang}>${esc(t.nav.other)}</a>`;
  const dim = (x) => (x.key ? `<span class="dim">${esc(x.key)}</span>` : '');
  return [
    '<!doctype html>',
    `<html lang="${lang === 'en' ? 'en' : 'zh-CN'}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${esc(t.title)}</title>`,
    `<link rel="icon" href="${up}favicon.ico">`,
    ...headTags(TIPS_PAGES, lang),
    `<style>${TIPS_CSS}</style>`,
    `<style class="dark-css" media="(prefers-color-scheme: dark)">${TIPS_DARK}</style>`,
    `<script>${TIPS_THEME}</script>`,
    ldScript(faqLd(items, TIPS_PAGES[lang].hreflang, lang)),
    '</head>',
    '<body>',
    '<div class="band">',
    `<header class="top shell"><a class="brand" href="../"><img src="${up}favicon.ico" alt="" width="20" height="20"><span>${esc(GEN[lang].name)}</span></a><nav class="links">${links}</nav></header>`,
    '<div class="head shell">',
    `<h1>${esc(t.name)}</h1>`,
    ...t.lead.map((p) => `<p class="lead">${rich(p)}</p>`),
    `<p class="go"><a class="cta" href="../">${esc(t.cta.label)}</a><span>${esc(t.cta.note)}</span></p>`,
    `<nav class="chips" aria-label="${esc(t.topicsTitle)}">${t.groups.map((g) => `<a href="#${g.id}">${esc(g.title)}<small>${g.items.length}</small></a>`).join('')}</nav>`,
    '</div>',
    '</div>',
    '<div class="shell body">',
    `<nav class="toc" aria-labelledby="toc-title"><h2 id="toc-title">${esc(t.tocTitle)}</h2>`,
    ...t.groups.map((g) => `<div class="toc-g"><a class="toc-h" href="#${g.id}">${esc(g.title)}</a><ul>${g.items.map((x) => `<li><a href="#${x.id}">${esc(x.q)}</a></li>`).join('')}</ul></div>`),
    '</nav>',
    '<main>',
    ...t.groups.flatMap((g) => [
      `<section id="${g.id}"><h2>${esc(g.title)}</h2>`,
      ...g.items.map((x) => `<article><div class="q"><h3 id="${x.id}">${esc(x.q)}</h3>${dim(x)}</div>${x.a.map((p) => `<p>${rich(p)}</p>`).join('')}</article>`),
      '</section>',
    ]),
    `<aside class="end"><p>${esc(t.cta.note)}</p><a class="cta" href="../">${esc(t.cta.label)}</a></aside>`,
    '</main>',
    '</div>',
    `<footer class="shell"><nav class="links">${links}</nav></footer>`,
    `<script>${TIPS_SPY}</script>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}
// 游戏机制那一页的样式。浅色：页头同生成器图纸的深蓝（#112f52，带一层很淡的格子），正文同生成器左栏的浅底；深色同生成器的中性灰。
// 强调色（浅色蓝、深色橙）只给：页头之外的去生成器按钮、目录里正读到的那条、正文里的链接；关键数用正文色，不上强调色
const TIPS_CSS = `
:root { color-scheme: light; --bg: #f6f8fb; --surface: #fff; --line: rgb(16 42 74 / 0.09); --line-2: rgb(16 42 74 / 0.16); --line-3: rgb(16 42 74 / 0.32);
  --text: #0f1d2e; --text-2: #435468; --text-3: #617388; --accent: #1f5fae; --accent-ink: #1a5299; --on-accent: #fff;
  --band: #112f52; --band-2: #163a63; --rule: #2f5578; --ink: #e6f0ff; --ink-2: #acc2da; --grid: rgb(230 240 255 / 0.05); --cta: #fff; --cta-ink: #112f52; --cta-hover: #e6f0ff;
  --ui: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
  --mono: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace; }
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg); color: var(--text-2); font: 15px/26px var(--ui); }
a { color: inherit; text-decoration: none; }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.shell { max-width: 1152px; margin: 0 auto; padding: 0 32px; }
.band { background-color: var(--band); background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px); background-size: 24px 24px; color: var(--ink); border-bottom: 1px solid var(--rule); }
.top { height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.brand { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: var(--ink); }
.links { display: flex; gap: 24px; font-size: 14px; }
.links a { white-space: nowrap; transition: color 0.15s; }
.band .links a { color: var(--ink-2); } .band .links a:hover { color: var(--ink); }
.head { padding-top: 32px; padding-bottom: 32px; }
h1 { margin: 0 0 8px; font-size: 32px; line-height: 40px; font-weight: 500; }
.lead { margin: 0; max-width: 640px; color: var(--ink-2); }
.lead a { color: var(--ink); text-decoration: underline; text-decoration-color: var(--rule); text-underline-offset: 3px; }
.go { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 16px; margin: 24px 0 0; font-size: 14px; color: var(--ink-2); }
.cta { display: inline-flex; align-items: center; height: 40px; padding: 0 20px; background: var(--cta); color: var(--cta-ink); font-size: 14px; font-weight: 500; border-radius: 4px; transition: background-color 0.15s; }
.cta::after { content: "→"; margin-left: 8px; }
.cta:hover { background: var(--cta-hover); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 32px; }
.chips a { height: 32px; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--rule); background: var(--band-2); font-size: 13px; color: var(--ink); transition: border-color 0.15s; }
.chips a:hover { border-color: var(--ink-2); }
.chips small { font: 12px var(--mono); color: var(--ink-2); font-variant-numeric: tabular-nums; }
.body { display: grid; grid-template-columns: 248px minmax(0, 720px); gap: 64px; }
.toc { position: sticky; top: 0; align-self: start; max-height: 100vh; overflow-y: auto; padding: 40px 0 32px; font-size: 13px; line-height: 20px; scrollbar-width: thin; }
.toc h2 { margin: 0 0 16px; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-3); }
.toc-g + .toc-g { margin-top: 20px; }
.toc-h { display: block; margin-bottom: 4px; font-weight: 500; color: var(--text); }
.toc ul { list-style: none; margin: 0; padding: 0; }
.toc li a { display: block; padding: 4px 0 4px 12px; margin-left: -1px; border-left: 2px solid transparent; box-shadow: inset 1px 0 var(--line-2); color: var(--text-3); transition: color 0.15s, border-color 0.15s; }
.toc li a:hover { color: var(--text); }
.toc li a[aria-current] { color: var(--accent-ink); border-left-color: var(--accent); box-shadow: none; }
main { padding: 40px 0 64px; min-width: 0; }
section { scroll-margin-top: 24px; }
section + section { margin-top: 48px; }
section > h2 { margin: 0; padding-bottom: 12px; border-bottom: 1px solid var(--line-2); font-size: 20px; line-height: 28px; font-weight: 500; color: var(--text); }
article { padding: 24px 0; border-bottom: 1px solid var(--line); }
article:last-child { border-bottom: 0; padding-bottom: 0; }
.q { display: flex; align-items: baseline; justify-content: space-between; gap: 24px; margin-bottom: 8px; }
h3 { margin: 0; font-size: 17px; line-height: 26px; font-weight: 500; color: var(--text); scroll-margin-top: 24px; }
p { margin: 0 0 8px; } article p:last-child { margin-bottom: 0; }
article a { color: var(--accent-ink); text-decoration: underline; text-decoration-color: var(--line-3); text-underline-offset: 3px; }
.dim { flex: none; display: inline-flex; align-items: center; gap: 6px; height: 20px; padding: 0 2px; border-left: 1px solid var(--line-3); border-right: 1px solid var(--line-3); color: var(--text); font: 500 13px/20px var(--mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
.dim::before, .dim::after { content: ""; width: 12px; height: 1px; background: var(--line-3); }
.end { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px 24px; margin-top: 48px; padding: 24px; background: var(--surface); border: 1px solid var(--line-2); }
.end p { margin: 0; max-width: 440px; color: var(--text); }
.end .cta { --cta: var(--accent); --cta-ink: var(--on-accent); --cta-hover: var(--accent-ink); }
footer { padding-bottom: 40px; }
footer .links { padding-top: 24px; border-top: 1px solid var(--line); }
footer .links a { color: var(--text-3); font-size: 13px; } footer .links a:hover { color: var(--text); }
@media (max-width: 899px) {
  .shell { padding: 0 16px; }
  .body { display: block; }
  .toc { display: none; }
  .head { padding-top: 24px; }
  h1 { font-size: 24px; line-height: 32px; }
  .chips { margin-top: 24px; }
  main { padding-top: 24px; }
  .q { flex-direction: column; align-items: flex-start; gap: 4px; }
}
@media (max-width: 599px) { .brand span { display: none; } .links { gap: 16px; font-size: 13px; } }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
`;
const TIPS_DARK = `:root { color-scheme: dark; --bg: #121212; --surface: #1c1c1f; --line: rgb(255 255 255 / 0.07); --line-2: rgb(255 255 255 / 0.13); --line-3: rgb(255 255 255 / 0.26);
  --text: #ededef; --text-2: #a6a6ad; --text-3: #85858c; --accent: #f0913a; --accent-ink: #f5a052; --on-accent: #141415;
  --band: #191919; --band-2: #202024; --rule: rgb(255 255 255 / 0.13); --ink: #ededef; --ink-2: #a6a6ad; --grid: rgb(255 255 255 / 0.03); --cta: #f0913a; --cta-ink: #141415; --cta-hover: #f5a052; }`;
// 目录里标出正读到的那条（aria-current）：取视口上部最后一个越过的问题标题
const TIPS_SPY =
  "(function(){var hs=[].slice.call(document.querySelectorAll('article h3[id]'));var ls={};[].forEach.call(document.querySelectorAll('.toc li a'),function(a){ls[a.getAttribute('href').slice(1)]=a;});" +
  "var cur=null;function upd(){var id=null;for(var i=0;i<hs.length;i++){if(hs[i].getBoundingClientRect().top<160)id=hs[i].id;else break;}if(id===cur)return;if(cur&&ls[cur])ls[cur].removeAttribute('aria-current');cur=id;" +
  "if(id&&ls[id]){ls[id].setAttribute('aria-current','true');var t=ls[id].closest('.toc'),r=ls[id].getBoundingClientRect(),b=t.getBoundingClientRect();if(r.top<b.top+40||r.bottom>b.bottom-40)t.scrollTop+=r.top-b.top-b.height/2;}}" +
  "addEventListener('scroll',upd,{passive:true});addEventListener('resize',upd);upd();})();";
// 计算器顶栏手动选过深浅色的（dsphc-theme，记着当时系统是深是浅；系统换过就不算）照它，同 web/index.template.html
const TIPS_THEME =
  "(function(){try{var o=JSON.parse(localStorage.getItem('dsphc-theme'));var s=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';" +
  "if(o&&(o.t==='dark'||o.t==='light')&&o.sys===s){var c=document.querySelector('style.dark-css');if(c)c.media=o.t==='dark'?'all':'not all';}}catch(e){}})();";

/** 网站根目录的 sitemap.xml */
export const sitemap = () =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...[GEN, CALC, TIPS_PAGES].flatMap((pages) =>
      Object.keys(pages).flatMap((l) => ['  <url>', `    <loc>${url(pages, l)}</loc>`, ...alternates(pages, 'xhtml:link').map((x) => `    ${x}`), '  </url>']),
    ),
    '</urlset>',
    '',
  ].join('\n');

/** 网站根目录的 robots.txt */
export const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`;
