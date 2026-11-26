// 同一条产线的几份搜索活（同一段里分到这个线程的几轮、没达标接着搜的下一段）共用一张生产图（只读）：
// place.js 记下的初始解评估（candsMemo）按图认，同一张图才能接着用
import type { Calculation } from '../calc/calculator.js'
import type { Candidate, FinishContext, FinishedCandidate, Graph, PlanOptions } from './domain.js'
// 线程池里的一份活（网页的后台线程和命令行的 worker_threads 共用）：输入输出都能结构化克隆。
//   { kind: 'search', calc, options, rounds }  跑搜索里指定的几轮退火 → searchRounds 的结果
//   { kind: 'cands', calc, options, part, parts } 评估初始解的第 part 片（共 parts 片）→ evalCands 的结果（routeOptions.splitCands）
//   { kind: 'finish', cand, ctx }              一个候选的后处理 → finishOne 的结果
//   { kind: 'plan', calc, options }            整条产线单线程规划（基准、压力测试并行跑多条产线用）→ 去掉 graph 的 planLine 结果
import { buildGraph } from './graph.js'
import { finishOne, planLine } from './index.js'
import type { PlannedLine } from './index.js'
import { searchRounds, evalCands, exactKey } from './place.js'

export type WorkerTask =
  | { kind: 'search'; calc: Calculation; options: PlanOptions; rounds: number[]; seg?: number }
  | {
      kind: 'cands'
      calc: Calculation
      options: PlanOptions
      part: number
      parts: number
      seg?: number
    }
  | { kind: 'finish'; cand: Candidate; ctx: FinishContext }
  | { kind: 'plan'; calc: Calculation; options: PlanOptions }
type TaskResults = {
  search: ReturnType<typeof searchRounds>
  cands: ReturnType<typeof evalCands>
  finish: FinishedCandidate | null
  plan: Omit<PlannedLine, 'graph'>
}
export type WorkerResult<T extends WorkerTask> = TaskResults[T['kind']]
export interface WorkerPool {
  size: number
  run<T extends WorkerTask>(task: T): Promise<WorkerResult<T>>
}

let graphMemo: { key: string; graph: Graph } | null = null
function graphOf(calc: Calculation) {
  const key = exactKey(calc)
  if (key === null) return buildGraph(calc)
  if (graphMemo?.key !== key) graphMemo = { key, graph: buildGraph(calc) }
  return graphMemo.graph
}

export function runTask<T extends WorkerTask>(task: T): WorkerResult<T>
export function runTask(task: WorkerTask): WorkerResult<WorkerTask> {
  if (task.kind === 'search') return searchRounds(graphOf(task.calc), task.options, task.rounds)
  if (task.kind === 'cands')
    return evalCands(graphOf(task.calc), task.options, task.part, task.parts)
  if (task.kind === 'finish') return finishOne(task.cand, task.ctx)
  if (task.kind === 'plan') {
    const p = planLine(task.calc, task.options)
    const { graph: _, ...out } = p
    return out
  }
  throw new Error(`未知任务 ${(task as { kind: string }).kind}`)
}
