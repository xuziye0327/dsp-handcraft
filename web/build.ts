import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import { build } from 'esbuild'

import { calcPage, LANGUAGES, robots, sitePage, sitemap, substitute, tipsPage } from './site.js'
import { SPRITE } from './src/glyphs.js'

const root = resolve(import.meta.dir, '..')
export const output = join(root, 'dist')
const read = (file: string) => readFile(join(root, file), 'utf8')
const safeScript = (code: string) => code.replace(/<\/script/gi, '<\\/script')
async function emit(file: string, contents: string) {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, contents)
}
async function bundle(entry: string, globalName?: string) {
  const result = await build({
    entryPoints: [join(root, entry)],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    globalName,
    jsx: 'automatic',
    target: 'es2020',
    define: { 'process.env.NODE_ENV': '"production"' },
    minify: true,
    write: false,
    legalComments: 'none',
    logLevel: 'silent',
  })
  return result.outputFiles[0].text
}

/** The generator and its worker must also work on file://, where module imports and
 * fetching a worker from a separate file may be blocked. Ship classic, local scripts. */
export async function buildSite(embed?: string) {
  const [worker, app, calc, bridge, calcEn, boot, tips, dsqBridge, genTemplate, calcTemplate] =
    await Promise.all([
      bundle('web/src/worker.ts', 'GeneratorWorker'),
      bundle('web/src/app.tsx'),
      bundle('web/calc/calc.tsx'),
      bundle('web/calc/bridge.ts'),
      bundle('web/src/i18n/calc.ts'),
      bundle('web/src/bootstrap.ts'),
      bundle('web/src/tips.ts'),
      bundle('web/dsq-bridge.ts'),
      read('web/index.template.html'),
      read('web/calc/index.html'),
    ])
  // One compiled engine for both transports. A worker executes the factory in its own
  // realm; when Blob workers are blocked the page calls it directly (no eval).
  const workerFactory = `function loadWorkerRuntime() {\n${safeScript(worker)}\nreturn GeneratorWorker;\n}\nconst WORKER_SRC = '(' + loadWorkerRuntime.toString() + ')()';`
  const generator = [
    ['<!--__SPRITE__-->', SPRITE],
    ['/*__BOOT_SRC__*/', safeScript(boot)],
    ['const WORKER_SRC = /*__WORKER_SRC__*/"";', workerFactory],
    ['/*__APP_SRC__*/', safeScript(app)],
  ].reduce((html, [marker, value]) => substitute(html, marker, value), genTemplate)
  const calculator = substitute(calcTemplate, '/*__BOOT_SRC__*/', safeScript(boot))
  await mkdir(join(output, 'calc'), { recursive: true })
  const files: Record<string, string> = {
    'calc/calc.js': calc,
    'calc/bridge.js': bridge,
    'calc/calc-en.js': calcEn,
    'dsq-bridge.js': dsqBridge,
    'sitemap.xml': sitemap(),
    'robots.txt': robots(),
  }
  for (const lang of LANGUAGES) {
    const base = lang === 'zh' ? '' : 'en/'
    const src = lang === 'zh' ? 'calc/bridge.js' : '../calc/bridge.js'
    files[`${base}index.html`] = substitute(
      sitePage(generator, lang),
      '<meta charset="utf-8">',
      `<meta charset="utf-8">\n<script src="${src}" data-calc="calc/index.html"></script>`,
    )
    files[`${base}calc/index.html`] = calcPage(calculator, lang)
    files[`${base}tips/index.html`] = tipsPage(lang, safeScript(tips))
  }
  await Promise.all([
    ...Object.entries(files).map(([path, content]) => emit(join(output, path), content)),
    ...[
      'icons',
      'img',
      'favicon.ico',
      'LICENSE',
      'CNAME',
      '.nojekyll',
      'data/THIRD_PARTY.md',
      'data/LICENSE-dsp-calc-MulanPSL2.txt',
    ].map((path) => cp(join(root, path), join(output, path), { recursive: true })),
    ...['react', 'react-dom', 'scheduler', 'pako'].map((pkg) =>
      cp(join(root, 'node_modules', pkg, 'LICENSE'), join(output, 'licenses', `${pkg}.txt`)),
    ),
    ...['calc-icons.avif', 'calc-icons.webp', 'calc-icons.js', 'dsq-data.js'].map((name) =>
      cp(join(root, 'web/calc', name), join(output, 'calc', name)),
    ),
  ])
  if (embed) {
    // An embedding host supplies its own bridge.js (dsq-bridge.js is provided for DSQ).
    const page = generator
      .replace('<meta charset="utf-8">', '<meta charset="utf-8"><script src="bridge.js"></script>')
      .replace('href="favicon.ico"', 'href="../../favicon.ico"')
    await emit(resolve(embed), page)
  }
  console.log(`已构建中文、英文生成器、计算器和游戏机制页：${output}`)
}
if (import.meta.main) {
  const option = process.argv.indexOf('--embed')
  if (option !== -1 && !process.argv[option + 1]) throw new Error('--embed 需要输出文件路径')
  await buildSite(option === -1 ? undefined : process.argv[option + 1])
}
