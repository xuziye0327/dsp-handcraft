import type { WorkerRequest, ProgressMessage, PreviewMessage } from '../types/worker.js'
import { createInlineRunner, type WorkerResponse, type PlanResult } from '../worker.js'
import plannerUrl from '../worker.ts?worker&url'
export type Progress = Omit<ProgressMessage, 'type' | 'id'>
export type Preview = PreviewMessage
export type Result = PlanResult
export type Response = WorkerResponse
type Request = Exclude<WorkerRequest, { type: 'task' }>
/** A file:// page can reject a Blob worker asynchronously. Replay only the unacknowledged startup messages. */
export function createWorkerClient(
  receive: (m: Response) => void,
  onError: (message: string) => void,
) {
  let worker: Worker | null = null,
    ready = false,
    url: string | undefined
  const pending: Request[] = []
  let post: (message: Request) => void
  function release() {
    if (url) {
      URL.revokeObjectURL(url)
      url = undefined
    }
  }
  function fallback() {
    worker?.terminate()
    worker = null
    release()
    const runner = createInlineRunner()
    runner.onmessage = ({ data }) => receive(data)
    post = (m) => runner.postMessage(m.type === 'init' ? { type: 'init', threads: 1 } : m)
    pending.splice(0).forEach(post)
  }
  try {
    const bundled = document.getElementById('planner-worker')?.textContent
    if (location.protocol === 'file:' && bundled) {
      const bytes = Uint8Array.from(atob(bundled), (char) => char.charCodeAt(0))
      url = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }))
    }
    const workerUrl = url ?? new URL(plannerUrl, location.href).href
    // Keep an offline Blob URL alive so the controller can start its worker pool.
    if (url)
      window.addEventListener('pagehide', (event) => {
        if (!event.persisted) release()
      })
    const workerType = import.meta.env.DEV ? 'module' : 'classic'
    worker = new Worker(workerUrl, { type: workerType })
    const w = worker
    w.onmessage = (ev: MessageEvent<Response>) => {
      if (!ready) {
        ready = true
        pending.length = 0
      }
      receive(ev.data)
    }
    w.onerror = (e) => {
      if (!ready) {
        e.preventDefault()
        fallback()
      } else onError(e.message || '未知错误')
    }
    post = (m) => {
      if (!ready) pending.push(m)
      w.postMessage(m.type === 'init' ? { ...m, url: workerUrl, workerType } : m)
    }
  } catch {
    fallback()
  }
  return {
    send(m: Request) {
      post(m)
    },
    get inline() {
      return !worker
    },
  }
}
