import { posix } from 'node:path'

import type { Plugin } from 'vite'

const moduleId = (file: string) => `dsp:${file}`
const dataUrl = (code: string) =>
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`

// Browsers will not load separate ES modules from file://. Put each page's Vite
// chunks in an import map, preserving their dependency graph and execution order.
export function offlinePages(workerName: string): Plugin {
  return {
    name: 'dsp:offline-pages',
    apply: 'build',
    generateBundle: {
      order: 'post',
      handler(_, bundle) {
        const planner = Object.values(bundle).find(
          (file) => file.type === 'asset' && file.fileName.startsWith(workerName),
        )
        for (const page of Object.values(bundle)) {
          if (page.type !== 'asset' || !page.fileName.endsWith('.html')) continue
          const imports: Record<string, string> = {}
          const visited = new Set<string>()
          function include(file: string) {
            if (visited.has(file)) return
            visited.add(file)
            const chunk = bundle[file]
            if (!chunk || chunk.type !== 'chunk') throw new Error(`Missing page module: ${file}`)
            let code = chunk.code
            for (const dependency of [...chunk.imports, ...chunk.dynamicImports]) {
              const relative = posix.relative(posix.dirname(file), dependency)
              const path = relative.startsWith('.') ? relative : `./${relative}`
              code = code.replaceAll(`"${path}"`, JSON.stringify(moduleId(dependency)))
              code = code.replaceAll(`'${path}'`, JSON.stringify(moduleId(dependency)))
              include(dependency)
            }
            imports[moduleId(file)] = dataUrl(code)
          }
          let html = String(page.source).replace(
            /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="([^"]+)")[^>]*><\/script>/g,
            (_, src: string) => {
              const file = posix.normalize(posix.join(posix.dirname(page.fileName), src))
              include(file)
              return `<script type="module">import ${JSON.stringify(moduleId(file))}</script>`
            },
          )
          if (page.fileName === 'index.html') {
            if (!planner || planner.type !== 'asset') throw new Error('Missing planner worker')
            const code = Buffer.from(planner.source).toString('base64')
            html = html.replace(
              '</head>',
              `<script type="application/octet-stream" id="planner-worker">${code}</script>\n</head>`,
            )
          }
          page.source = html.replace(
            '<head>',
            `<head>\n<script type="importmap">${JSON.stringify({ imports })}</script>`,
          )
        }
      },
    },
  }
}
