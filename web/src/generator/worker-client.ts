import type { WorkerRequest, ProgressMessage, PreviewMessage } from '../types/worker.js'
import type { WorkerResponse, PlanResult } from '../worker.js'
export type Progress = Omit<ProgressMessage, 'type' | 'id'>
export type Preview = PreviewMessage
export type Result = PlanResult
export type Response = WorkerResponse
type Request = Exclude<WorkerRequest, { type: 'task' }>
/** A file:// page can reject a Blob worker asynchronously. Replay only the unacknowledged startup messages. */
export function createWorkerClient(
  source: string,
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
    const runner = loadWorkerRuntime().createInlineRunner()
    runner.onmessage = ({ data }) => receive(data)
    post = (m) => runner.postMessage(m.type === 'init' ? { type: 'init', threads: 1 } : m)
    pending.splice(0).forEach(post)
  }
  try {
    url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
    worker = new Worker(url)
    const w = worker
    w.onmessage = (ev: MessageEvent<Response>) => {
      if (!ready) {
        ready = true
        release()
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
      w.postMessage(m)
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
