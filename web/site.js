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
  const desc = /<meta name="description" content="[^"]*">\n/.exec(s);
  if (!desc) throw new Error('没找到计算器原来的 description');
  s = s.replace(desc[0], ''); // 换成下面网站的那句
  const icon = '<link rel="icon" href="favicon.ico">';
  return must(s, icon, `<link rel="icon" href="${up}favicon.ico">\n${headTags(CALC, lang).join('\n')}`);
}

/**
 * 网站上「游戏机制实测」的一页（中文 tips/index.html，英文 en/tips/index.html），整页在这里出：不带脚本应用，静态文字，
 * 每个问题一个 h3 带锚点（#id，生成器页面底下链过来），按分组排，开头一份目录；头上同生成器的标签，FAQPage 结构化数据。
 * 颜色同生成器（浅色、系统深色时深色；计算器顶栏手动选过的照 dsphc-theme）。
 */
export function tipsPage(lang) {
  const t = TIPS[lang];
  const up = lang === 'en' ? '../../' : '../'; // 到网站根目录
  const other = lang === 'en' ? '../../tips/' : '../en/tips/';
  const items = tipItems(lang);
  const nav = [`<a href="../">${esc(t.nav.gen)}</a>`, `<a href="../calc/">${esc(t.nav.calc)}</a>`, `<a href="${other}" hreflang="${GEN[OTHER[lang]].hreflang}" lang="${OTHER[lang] === 'en' ? 'en' : 'zh-CN'}">${esc(t.nav.other)}</a>`];
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
    `<header class="top"><a class="brand" href="../"><img src="${up}favicon.ico" alt="" width="20" height="20">${esc(GEN[lang].name)}</a><nav>${nav.join('')}</nav></header>`,
    '<main>',
    `<h1>${esc(t.name)}</h1>`,
    ...t.lead.map((p) => `<p>${rich(p)}</p>`),
    `<nav class="toc" aria-labelledby="toc-title"><h2 id="toc-title">${esc(t.tocTitle)}</h2>`,
    ...t.groups.map((g) => `<p class="toc-group">${esc(g.title)}</p><ul>${g.items.map((x) => `<li><a href="#${x.id}">${esc(x.q)}</a></li>`).join('')}</ul>`),
    '</nav>',
    ...t.groups.flatMap((g) => [`<section><h2>${esc(g.title)}</h2>`, ...g.items.map((x) => `<article><h3 id="${x.id}">${esc(x.q)}</h3>${x.a.map((p) => `<p>${rich(p)}</p>`).join('')}</article>`), '</section>']),
    '</main>',
    `<footer><nav>${nav.join('')}</nav></footer>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}
// 游戏机制实测那一页的样式：同生成器页面底下简介的字号、颜色（web/index.template.html 的 .about）
const TIPS_CSS = `
:root { color-scheme: light; --bg: #f9fbfd; --bar: #fff; --line: rgb(16 42 74 / 0.09); --text: #0f1d2e; --text-2: #435468; --text-3: #617388; --accent-ink: #1a5299;
  --ui: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text-2); font: 15px/26px var(--ui); }
a { color: var(--accent-ink); text-underline-offset: 3px; }
.top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; padding: 10px 16px; background: var(--bar); border-bottom: 1px solid var(--line); }
.brand { display: flex; align-items: center; gap: 8px; color: var(--text); font-weight: 600; text-decoration: none; }
.top nav, footer nav { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 14px; }
main { max-width: 760px; margin: 0 auto; padding: 28px 16px 40px; }
h1 { margin: 0 0 12px; font-size: 24px; line-height: 32px; font-weight: 600; color: var(--text); }
h2 { margin: 36px 0 8px; font-size: 18px; line-height: 26px; font-weight: 600; color: var(--text); }
h3 { margin: 24px 0 6px; font-size: 15px; line-height: 24px; font-weight: 600; color: var(--text); scroll-margin-top: 12px; }
p { margin: 0 0 10px; }
.toc { margin-top: 24px; padding: 4px 16px 8px; border: 1px solid var(--line); border-radius: 4px; background: var(--bar); }
.toc h2 { margin: 12px 0 4px; font-size: 15px; }
.toc .toc-group { margin: 10px 0 2px; color: var(--text-3); font-size: 13px; }
.toc ul { margin: 0; padding-left: 18px; }
section > h2 { padding-top: 12px; border-top: 1px solid var(--line); }
footer { max-width: 760px; margin: 0 auto; padding: 16px 16px 32px; border-top: 1px solid var(--line); }
`;
const TIPS_DARK = ':root { color-scheme: dark; --bg: #101012; --bar: #19191c; --line: rgb(255 255 255 / 0.07); --text: #ededef; --text-2: #a6a6ad; --text-3: #85858c; --accent-ink: #f5a052; }';
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
