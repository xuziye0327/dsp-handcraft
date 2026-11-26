import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

import { offlinePages } from './src/web/offline.ts'
import { renderPage, robots, sitemap } from './src/web/site.ts'

const path = (file: string) => fileURLToPath(new URL(file, import.meta.url))
const webRoot = path('src/web/')
const planner = 'assets/planner-'

export default defineConfig(({ mode }) => ({
  root: webRoot,
  publicDir: path('public/'),
  base: './',
  appType: 'mpa',
  oxc: { jsx: { runtime: 'automatic' } },
  build: {
    outDir: path('dist/'),
    emptyOutDir: true,
    license: true,
    modulePreload: false,
    rolldownOptions: {
      input: ['index.html', 'calc/index.html', 'tips/index.html'].map((file) => `${webRoot}${file}`),
    },
  },
  worker: {
    format: 'iife',
    rolldownOptions: { output: { entryFileNames: `${planner}[hash].js` } },
  },
  experimental: {
    renderBuiltUrl(file, { hostType }) {
      // The planner is only referenced by the root page. Its import-meta URL
      // can be a data URL when the module is inlined for offline use.
      if (hostType === 'js' && file.startsWith(planner))
        return { runtime: JSON.stringify(`./${file}`) }
      return { relative: true }
    },
  },
  plugins: [
    {
      name: 'dsp:static-pages',
      transformIndexHtml: {
        order: 'pre',
        handler(html, { filename }) {
          const name = filename.slice(webRoot.length).replaceAll('\\', '/')
          if (mode === 'embed' && name === 'index.html')
            html = html.replace('/calc/bridge.ts', '/dsq-bridge.ts')
          return renderPage(html, name)
        },
      },
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots() })
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap() })
      },
    },
    offlinePages(planner),
  ],
}))
