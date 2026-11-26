// Serve the same six pages and the same worker bundles as the offline build.
import { watch } from 'node:fs'
import { join, resolve, sep } from 'node:path'

const root = resolve(import.meta.dir, '..')
const output = join(root, 'dist')
async function buildSite() {
  // Reload build-time modules as well as client entries when the site changes.
  const child = Bun.spawn([process.execPath, 'run', 'build'], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if ((await child.exited) !== 0) throw new Error('网站构建失败，详情见上方输出。')
}
await buildSite()
let builds = Promise.resolve()
let timer: ReturnType<typeof setTimeout>
function changed() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    builds = builds
      .then(() => buildSite())
      .catch((error: unknown) => {
        console.error(error)
      })
  }, 100)
}
for (const dir of ['web', 'src', 'data', 'icons', 'img'])
  watch(join(root, dir), { recursive: true }, changed)
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 3000),
  async fetch(request) {
    const method = request.method
    if (method !== 'GET' && method !== 'HEAD')
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
    const url = new URL(request.url)
    let pathname: string
    try {
      pathname = decodeURIComponent(url.pathname)
    } catch {
      return new Response(null, { status: 400 })
    }
    if (pathname.endsWith('/')) pathname += 'index.html'
    const path = resolve(output, `.${pathname}`)
    if (!path.startsWith(output + sep)) return new Response(null, { status: 404 })
    const file = Bun.file(path)
    if (!(await file.exists())) return new Response('Not found', { status: 404 })
    return new Response(method === 'HEAD' ? null : file, {
      headers: { 'Content-Type': file.type, 'Cache-Control': 'no-store' },
    })
  },
})
console.log(`开发预览：${server.url}`)
