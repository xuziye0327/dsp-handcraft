import { byId as $, signal } from './shared'
async function write(text: string | Promise<string>) {
  if (
    typeof text !== 'string' &&
    typeof ClipboardItem === 'function' &&
    navigator.clipboard?.write
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': text.then((t) => new Blob([t], { type: 'text/plain' })) }),
      ])
      return
    } catch {
      /* Fall back when delayed clipboard items aren't supported. */
    }
  }
  const t = await text
  try {
    await navigator.clipboard.writeText(t)
  } catch {
    const bp = $<HTMLTextAreaElement>('bp')
    bp.value = t
    bp.select()
    if (!document.execCommand('copy')) throw new Error('请手动复制蓝图字符串。')
  }
}
interface ClipboardContext {
  beltless: boolean
  busy: () => boolean
  text: () => string | Promise<string>
  afterCopy: () => void
  error: (msg: string) => void
}
export function createClipboard(ctx: ClipboardContext) {
  const changed = signal()
  const ui = {
    ready: false,
    liked: false,
    visible: false,
    count: null as number | null,
    label: '复制蓝图',
  }
  let resetTimer: number | undefined
  async function count(op: 'get' | 'hit') {
    try {
      const r = await fetch(
        `https://abacus.jasoncameron.dev/${op}/dsp-handcraft/${ctx.beltless ? 'beltless-likes' : 'likes'}`,
        { cache: 'no-store', referrerPolicy: 'no-referrer' },
      )
      const j =
        op === 'get' && r.status === 404 ? { value: 0 } : ((await r.json()) as { value?: number })
      if (
        typeof j.value === 'number' &&
        Number.isFinite(j.value) &&
        (op === 'hit' || ui.count == null)
      ) {
        ui.count = j.value
        changed.update()
      }
    } catch {
      /* The global counter is optional, including for offline pages. */
    }
  }
  async function copy() {
    try {
      const text = ctx.text()
      if (typeof text !== 'string') {
        ui.label = '复制中…'
        changed.update()
      }
      await write(text)
      ctx.afterCopy()
      ui.visible = !!$<HTMLTextAreaElement>('bp').value
      ui.label = '已复制'
      changed.update()
      window.clearTimeout(resetTimer)
      resetTimer = window.setTimeout(() => {
        ui.label = '复制蓝图'
        changed.update()
      }, 2000)
    } catch (e) {
      ui.label = '复制蓝图'
      changed.update()
      ctx.error(e instanceof Error ? e.message : String(e))
    }
  }
  function like() {
    if (ui.liked || ctx.busy()) return
    ui.liked = true
    if (ui.count != null) ui.count++
    changed.update()
    void count('hit')
  }
  return {
    changed,
    ui,
    copy,
    like,
    busy: ctx.busy,
    load: () => count('get'),
    newResult() {
      window.clearTimeout(resetTimer)
      ui.ready = true
      ui.liked = false
      ui.visible = false
      ui.label = '复制蓝图'
      changed.update()
    },
  }
}
