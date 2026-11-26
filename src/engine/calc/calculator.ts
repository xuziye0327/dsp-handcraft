// 迷你量化计算器：给规划器生成输入（网页、命令行、测试都用它）。输出结构和 antian369/dsp-calc 的计算结果（produceUnits）对应。
import {
  item,
  recipe as recipeOf,
  factory,
  RAW_ITEM_IDS,
  RECYCLE_REFINERY_RECIPES,
  defaultRecipe,
  SPRAY_LEVELS,
} from '../gamedata.js'
import type { Factory, Recipe } from '../gamedata.js'
import { storeUnits } from '../plan/storage.js'

export interface Target {
  target: string | number
  rate: number
}
export interface CalculateOptions extends Partial<Target> {
  targets?: Target[]
  smelter?: number
  assembler?: number
  chemical?: number
  lab?: number
  labStack?: number
  recipes?: Record<string, string | number>
  raw?: (string | number)[]
  spray?: number
  sprayFor?: number[] | null
  latitude?: 'equator' | 'high'
  supply?: string | null
  storeSorter?: number
  storeLayers?: number
  storeBelt?: number
}
export interface Flow {
  itemId: number
  from: string
  to: string
  rate: number
  byproduct?: boolean
  extra?: boolean
}
export interface ProductionUnit {
  id: string
  itemId: number
  item: string
  recipeId: number
  recipe: string
  factoryId: number
  factory: string
  exact: number
  count: number
  outputRate: number // 主产物总产量，含回流
  levels?: number
  stacks?: number
  labs?: number
  shared?: number[]
  inputKeys?: Record<number, number>
  spray: { mode: 'extra' | 'speed'; outMul: number; speedMul: number } | null
  store?: {
    kind: 'in' | 'out'
    dist: boolean
    rate: number
    byproduct: boolean
    minutes: number
    tank?: boolean
  }
}
interface SupplyRate {
  itemId: number
  item: string
  rate: number
}
export interface Calculation {
  target: string
  targetId: number
  rate: number
  label: string
  latitude: 'equator' | 'high'
  targets: { itemId: number; name: string; rate: number }[]
  units: ProductionUnit[]
  raw: SupplyRate[]
  byproducts: (SupplyRate & { from: string; of: number })[]
  flows: Flow[]
  spray:
    | (NonNullable<(typeof SPRAY_LEVELS)[number]> & { rate: number; items: number[]; to: string[] })
    | null
  storeUnits?: { supply: string; box: number; dist: boolean }
}

const idOrName = (v: string | number) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v)

const EPS = 1e-9

type Goal = { item: ReturnType<typeof item>; rate: number }
type Materials = Pick<Calculation, 'units' | 'raw' | 'byproducts' | 'flows' | 'spray'>
type SprayLevel = (typeof SPRAY_LEVELS)[number]

function makeUnit(
  id: string,
  itemId: number,
  r: Recipe,
  f: Factory,
  exact: number,
  outputRate: number,
  spray: ProductionUnit['spray'],
  labStack: number,
): ProductionUnit {
  const unit: ProductionUnit = {
    id,
    itemId,
    item: item(itemId).name,
    recipeId: r.id,
    recipe: r.name,
    factoryId: f.id,
    factory: f.name,
    exact,
    count: Math.ceil(exact - EPS),
    outputRate,
    spray,
  }
  if (f.kind === 'lab') {
    const max = Math.max(1, Math.floor(Number(labStack) || 1))
    unit.stacks = Math.ceil(unit.count / max)
    unit.levels = Math.ceil(unit.count / unit.stacks)
    unit.labs = unit.stacks * unit.levels
    unit.count = unit.stacks
  }
  return unit
}

function amounts(ingredients: Recipe['inputs'], multiplier = 1): Map<number, number> {
  const counts = new Map<number, number>()
  for (const { id, count } of ingredients) counts.set(id, (counts.get(id) ?? 0) + count * multiplier)
  return counts
}

const isRecycle = (r: Recipe) =>
  RECYCLE_REFINERY_RECIPES.has(r.id) && r.inputs.some((i) => r.outputs.some((o) => o.id === i.id))

type Source = { unit: ProductionUnit; left: number; used: boolean; total: number; loops: boolean }

// 用可以独立开工的同种产物补回流原料。换下的回流量改供原来的去向，总产耗不变。
function seedLoops(
  loops: { flow: Flow; unit: ProductionUnit }[],
  sources: Map<number, Source[]>,
  flows: Flow[],
  external: Set<number>,
) {
  const downstream = (from: string) => {
    const reached = new Set([from])
    for (const id of reached)
      for (const f of flows) if (f.rate > EPS && f.from === id && f.to !== 'OUT') reached.add(f.to)
    return reached
  }
  const send = (itemId: number, from: string, to: string, rate: number) => {
    const flow = flows.find((f) => f.itemId === itemId && f.from === from && f.to === to)
    if (flow) flow.rate += rate
    else flows.push({ itemId, from, to, rate })
  }
  for (const { flow: loop, unit } of loops) {
    const { itemId, from: self } = loop
    if (external.has(itemId)) continue
    const pool = sources.get(itemId)
    if (!pool) continue
    const own = pool.find((s) => s.unit.id === self) ?? {
      unit,
      left: 0,
      total: 0,
      used: false,
      loops: true,
    }
    for (const source of pool) {
      if (loop.rate <= EPS) break
      const from = source.unit.id
      if (downstream(self).has(from)) continue
      const exchange = (available: number) => {
        const rate = Math.min(loop.rate, available)
        if (rate <= EPS) return 0
        loop.rate -= rate
        source.used = true
        send(itemId, from, self, rate)
        return rate
      }
      const surplus = exchange(source.left)
      source.left -= surplus
      own.left += surplus
      for (const f of flows.slice()) {
        if (loop.rate <= EPS) break
        if (f.itemId !== itemId || f.from !== from || f.from === f.to) continue
        if (downstream(f.to).has(self)) continue
        const rate = exchange(f.rate)
        if (rate <= EPS) continue
        f.rate -= rate
        send(itemId, self, f.to, rate)
      }
    }
    if (!pool.includes(own) && own.left > EPS) pool.push(own)
  }
}

// 只在回流配方进入需求链时合并物料平衡。每种物品仍有一个指定配方，但在产的其他配方也可以补货。
function recycleMaterials(
  goals: Goal[],
  chooseRecipe: (id: number) => Recipe | null,
  chooseFactory: (r: Recipe) => Factory,
  external: Set<number>,
  sprayGoals: Set<number>,
  eff: SprayLevel,
  labStack: number,
): Materials | null {
  const selected = new Map<Recipe, number[]>()
  const pending = new Set(goals.map(({ item }) => item.id))
  const owned = new Set<number>()
  for (const id of pending) {
    const r = chooseRecipe(id)
    if (!r) continue
    owned.add(id)
    const ids = selected.get(r)
    if (ids) {
      ids.push(id)
      continue
    }
    selected.set(r, [id])
    const output = amounts(r.outputs)
    for (const [ingredient, count] of amounts(r.inputs))
      if (count > (output.get(ingredient) ?? 0)) pending.add(ingredient)
  }
  if (![...selected.keys()].some(isRecycle)) return null

  const processes = [...selected].map(([r, ids]) => {
    const fed = eff && ids.some((id) => sprayGoals.has(id)) && r.inputs.length > 0
    const spray = fed
      ? r.proliferator & 2
        ? ({ mode: 'extra', outMul: 1 + eff.extra, speedMul: 1 } as const)
        : r.proliferator & 1
          ? ({ mode: 'speed', outMul: 1, speedMul: 1 + eff.speed } as const)
          : null
      : null
    const inputs = amounts(r.inputs)
    const outputs = amounts(r.outputs, spray?.outMul ?? 1)
    const net = new Map(outputs)
    for (const [id, count] of inputs) net.set(id, (net.get(id) ?? 0) - count)
    return { r, ids, inputs, outputs, net, spray, crafts: 0 }
  })
  const requested = new Map<number, number>()
  for (const { item, rate } of goals) requested.set(item.id, (requested.get(item.id) ?? 0) + rate)

  // 以净产量算开工量：每组只补自己负责的物品的缺口，多产物取最大值。
  // 供需互相影响（如裂解吃精炼油、等离子精炼又补氢），同时更新并加阻尼以吸收往复波动。
  const tolerance = (rate: number) => Math.max(EPS / 100, Math.abs(rate) * Number.EPSILON * 16)
  let settled = false
  for (let round = 0; round < 2048 && !settled; round++) {
    const unmet = new Map(requested)
    for (const { net, crafts } of processes)
      for (const [id, count] of net) {
        if (count > 0 && external.has(id)) continue
        unmet.set(id, (unmet.get(id) ?? 0) - count * crafts)
      }
    settled = true
    for (const p of processes) {
      const next = Math.max(
        0,
        ...p.ids.map((id) => p.crafts + (unmet.get(id) ?? 0) / p.net.get(id)!),
      )
      if (!Number.isFinite(next) || Math.abs(next - p.crafts) > tolerance(next)) settled = false
      p.crafts += (next - p.crafts) / 2
    }
  }
  if (!settled) throw new Error('回流配方无法平衡：请检查配方组合，或将缺少来源的物品设为外部供应。')

  const units: ProductionUnit[] = []
  const raw = new Map<number, number>()
  const byproducts: Calculation['byproducts'] = []
  const flows: Flow[] = []
  const sources = new Map<number, Source[]>()
  const loops: { flow: Flow; unit: ProductionUnit }[] = []
  const inputs: { itemId: number; to: string; rate: number }[] = []
  const primary = new Set<number>()
  const sprayed = new Set<number>()
  let sprayFlow = 0
  for (const { r, ids, inputs: grossIn, outputs, net, spray, crafts } of processes) {
    if (crafts <= EPS) continue
    const id = r.outputs.find((o) => ids.includes(o.id))!.id
    const f = chooseFactory(r)
    if (f.speed == null) throw new Error(`「${f.name}」不能生产「${r.name}」`)
    const exact = (crafts * r.time) / (60 * f.speed * (spray?.speedMul ?? 1))
    const unit = makeUnit(
      `g${units.length}`,
      id,
      r,
      f,
      exact,
      crafts * outputs.get(id)!,
      spray,
      labStack,
    )
    units.push(unit)
    primary.add(id)
    for (const [itemId, count] of grossIn) {
      const loop = Math.min(count, outputs.get(itemId) ?? 0) * crafts
      if (loop > EPS) {
        const flow = { itemId, from: unit.id, to: unit.id, rate: loop }
        flows.push(flow)
        loops.push({ flow, unit })
      }
      if (spray) {
        sprayed.add(itemId)
        sprayFlow += count * crafts
      }
    }
    for (const [itemId, count] of net) {
      const rate = count * crafts
      if (rate < -EPS) inputs.push({ itemId, to: unit.id, rate: -rate })
      if (rate > EPS) {
        if (!sources.has(itemId)) sources.set(itemId, [])
        sources.get(itemId)!.push({
          unit,
          left: rate,
          total: rate,
          used: false,
          loops: grossIn.has(itemId),
        })
      }
    }
  }
  const allocate = (itemId: number, to: string, rate: number) => {
    let left = rate
    if (!external.has(itemId))
      for (const source of sources.get(itemId) ?? []) {
        if (left <= EPS) break
        const used = Math.min(left, source.left)
        if (used <= EPS) continue
        flows.push({ itemId, from: source.unit.id, to, rate: used })
        source.left -= used
        source.used = true
        left -= used
      }
    if (left <= Math.max(EPS, tolerance(rate) * 8)) return
    if (owned.has(itemId)) throw new Error(`回流配方无法平衡：缺少「${item(itemId).name}」。`)
    raw.set(itemId, (raw.get(itemId) ?? 0) + left)
    flows.push({ itemId, from: 'RAW', to, rate: left })
  }
  for (const { item, rate } of goals) allocate(item.id, 'OUT', rate)
  for (const { itemId, to, rate } of inputs) allocate(itemId, to, rate)
  seedLoops(loops, sources, flows, external)
  for (const [itemId, pool] of sources) {
    // shared 保留唯一的物品代表；物流的所有来源以 flows 为准。
    if (!primary.has(itemId)) {
      const representative = pool.find((s) => s.used)
      if (representative) (representative.unit.shared ??= []).push(itemId)
    }
    for (const { unit, left, used, total, loops } of pool) {
      if (left <= Math.max(EPS, tolerance(total) * 8)) continue
      if (used || loops || unit.itemId === itemId) {
        flows.push({ itemId, from: unit.id, to: 'OUT', rate: left, extra: true })
      } else {
        byproducts.push({
          itemId,
          item: item(itemId).name,
          rate: left,
          from: unit.id,
          of: unit.itemId,
        })
        flows.push({ itemId, from: unit.id, to: 'OUT', rate: left, byproduct: true })
      }
    }
  }
  return {
    units,
    raw: [...raw].map(([itemId, rate]) => ({ itemId, item: item(itemId).name, rate })),
    byproducts,
    flows: flows.filter((f) => f.rate > EPS),
    spray: eff
      ? {
          ...eff,
          rate: sprayFlow / eff.sprays,
          items: [...sprayed],
          to: units.filter((u) => u.spray).map((u) => u.id),
        }
      : null,
  }
}

/**
 * @param {object} o
 * @param {string|number} o.target 目标产物（单目标写法）
 * @param {number} o.rate 目标产量，个/分钟
 * @param {{target: string|number, rate: number}[]} [o.targets] 多个最终目标（给了就忽略 target/rate）
 * @param {number} [o.smelter=2302] 熔炉 ID
 * @param {number} [o.assembler=2303] 制造台 ID
 * @param {number} [o.chemical=2309] 化工厂 ID（2317 量子化工厂）
 * @param {number} [o.lab=2901] 研究站 ID（2902 自演化研究站），做矩阵用
 * @param {number} [o.labStack=15] 研究站最多叠几层（垂直建造科技 1~6 级：5/7/9/11/13/15 层，来自 BWIKI）。
 *   研究站的 count 是「叠数」，每叠 levels 层，各叠一样高：需要 n 台、最多叠 m 层时叠数 = ⌈n/m⌉、层数 = ⌈n/叠数⌉
 * @param {Record<string,string|number>} [o.recipes] 指定配方 { 物品名或 ID: 配方名或 ID }；可以是有副产物的配方（如石墨烯高效），
 *   普通产线的副产物单独送到出口；有回流时，在产的配方可以用副产物补足同种物品的需求
 * @param {string[]} [o.raw] 额外视为外部供应的物品
 * @param {0|1|2|3} [o.spray=0] 喷增产剂（Mk.I~Mk.III）：只喷最终产物的直接原料，只有最终产物那道吃到——
 *   能增产的按增产（产物 +12.5%/20%/25%），只能加速的按加速（+25%/50%/100%）算（游戏规则：一台工厂的每一种原料都喷到才有效果，
 *   按最低喷涂等级算；工厂产出的东西不带增产，game-rules 第 29 条）。这几种原料要是也供给上游的工厂（比如粒子容器的铜块还要做磁线圈），
 *   喷涂机放在上游都取完之后、最终工厂之前（plan/layout/belts.js），上游吃到的是没喷的，增产剂不白耗。
 *   calc.spray.items 是要喷的物品，calc.spray.to 是吃到增产的配方组；增产剂用量 = 进这几组的原料流量之和 ÷ 每个增产剂的喷涂次数（calc.spray.rate）
 * @param {number[]} [o.sprayFor] 吃到增产的是哪些物品的配方（默认就是目标）：大产线切块时（plan/modules.js）各块的目标是中间产物，
 *   这里传整条线的最终产物，最终产物不在这一块里时这一块不喷
 * @param {'equator'|'high'} [o.latitude='high'] 化工厂、量子化工厂、原油精炼厂的间距：默认 'high' 加宽（任何纬度都能放，gamedata.js 的 GEOMETRY_HIGH_LATITUDE），
 *   'equator' 赤道压缩（化工厂隔 7、量子化工厂隔 8、精炼厂隔 3，只在赤道附近放得下；网页默认这套，左栏「化工厂、精炼厂高纬度间距展开」打开才加宽）。
 *   只影响排布，不影响台数；原样放进返回值，buildGraph 按它取工厂几何
 * @param {string} [o.supply] 箱子供货（不接物流站时，plan/storage.js 的 SUPPLY）：原料、成品、副产物换成排进行里的储物仓
 *   （plan/storage.js 的 storeUnits，液体、一条带装不下的原料除外）；storeSorter 左栏的分拣器、storeLayers 最多叠几层、
 *   storeBelt 传送带等级
 */
export function calculate({
  target,
  rate,
  targets,
  smelter = 2302,
  assembler = 2303,
  chemical = 2309,
  lab = 2901,
  labStack = 15,
  recipes = {},
  raw = [],
  spray = 0,
  sprayFor = null,
  latitude = 'high',
  supply = null,
  storeSorter = 2013,
  storeLayers = 15,
  storeBelt = 3,
}: CalculateOptions): Calculation {
  const requested = targets?.length
    ? targets
    : target != null && rate != null
      ? [{ target, rate }]
      : []
  if (!requested.length) throw new Error('请选择目标产物和每分钟产量')
  const goals = requested.map((t) => ({ item: item(t.target), rate: Number(t.rate) }))
  const targetItem = goals[0].item
  const extIds = new Set(raw.map((n) => item(n).id))
  const overrides = new Map(
    Object.entries(recipes || {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [item(idOrName(k)).id, recipeOf(idOrName(v))]),
  )

  const chooseRecipe = (itemId: number, recycle = false) => {
    if (extIds.has(itemId)) return null
    const o = overrides.get(itemId)
    // 原矿也能指定配方做（硅石用石矿炼）；不指定就是开采，从外面来。
    if (o?.inputs.length) {
      if (isRecycle(o)) {
        if (recycle && (amounts(o.outputs).get(itemId) ?? 0) > (amounts(o.inputs).get(itemId) ?? 0))
          return o
      } else if (
        !o.inputs.some((x) => x.id === itemId) &&
        (!recycle || o.outputs.some((x) => x.id === itemId))
      )
        return o
    }
    if (RAW_ITEM_IDS.has(itemId)) return null
    return defaultRecipe(itemId)
  }
  const preferred = [smelter, assembler, chemical, lab]
  const chooseFactory = (r: Recipe) =>
    factory(preferred.find((id) => r.factories.includes(id)) ?? r.factories[0])
  const eff = SPRAY_LEVELS[spray] ?? null
  const goalIds = new Set(sprayFor ? sprayFor.map(Number) : goals.map((g) => g.item.id))
  const finish = (materials: Materials): Calculation => {
    if (!materials.units.length) {
      const id = targetItem.id
      const why = extIds.has(id)
        ? '设成了外部供应'
        : RAW_ITEM_IDS.has(id)
          ? '是原矿，直接开采'
          : '没有能在产线里做的配方'
      throw new Error(
        `「${goals.map((g) => g.item.name).join('、')}」${why}，产线里没有要排的工厂。`,
      )
    }
    // target/targetId/rate 保留给单目标的老代码；多目标时 target 是「A+B」，rate 是第一个目标的产量
    const result: Calculation = {
      spray: materials.spray,
      target: goals.map((g) => g.item.name).join('+'),
      targetId: targetItem.id,
      rate: goals[0].rate,
      targets: goals.map((g) => ({ itemId: g.item.id, name: g.item.name, rate: g.rate })),
      label: goals.map((g) => `${g.item.name}${g.rate}`).join('+'),
      units: materials.units,
      raw: materials.raw,
      byproducts: materials.byproducts,
      flows: materials.flows,
      latitude: latitude === 'equator' ? 'equator' : 'high',
    }
    return supply
      ? storeUnits(result, { supply, sorter: storeSorter, maxLayers: storeLayers, belt: storeBelt })
      : result
  }
  if ([...overrides.values()].some(isRecycle)) {
    const materials = recycleMaterials(
      goals,
      (id) => chooseRecipe(id, true),
      chooseFactory,
      extIds,
      goalIds,
      eff,
      labStack,
    )
    if (materials) return finish(materials)
  }

  // 深度优先得到拓扑序（后序），再逆序传播需求，保证一个物品的需求在展开前已全部累加
  const recipeFor = new Map<number, Recipe | null>()
  const post: number[] = []
  const visiting = new Set<number>()
  const visit = (itemId: number) => {
    if (recipeFor.has(itemId)) return
    if (visiting.has(itemId)) throw new Error(`配方存在循环：${item(itemId).name}`)
    visiting.add(itemId)
    const r = chooseRecipe(itemId)
    recipeFor.set(itemId, r)
    if (r) for (const inp of r.inputs) visit(inp.id)
    visiting.delete(itemId)
    post.push(itemId)
  }
  // 目标之间也可能有依赖（比如同时要电动机和电磁涡轮），按拓扑序统一展开
  for (const g of goals) visit(g.item.id)

  const demand = new Map<number, number>()
  for (const g of goals) demand.set(g.item.id, (demand.get(g.item.id) || 0) + g.rate)
  // 只喷最终产物的直接原料；最终产物的配方不吃增产剂（proliferator 为 0）就不喷
  const canSpray = (r: Recipe | null | undefined): r is Recipe =>
    !!r && r.inputs.length > 0 && (r.proliferator & 3) > 0
  const sprayed = eff
    ? new Set(
        [...goalIds].flatMap((id) => {
          const recipe = recipeFor.get(id)
          return canSpray(recipe) ? recipe.inputs.map((x) => x.id) : []
        }),
      )
    : null
  let sprayFlow = 0 // 进吃到增产的工厂的原料流量之和（每一股都过了喷涂机）
  const units: ProductionUnit[] = []
  const rawSupply: SupplyRate[] = []
  const byproducts: Calculation['byproducts'] = []
  const flows: Flow[] = goals.map((g) => ({
    itemId: g.item.id,
    from: 'RAW',
    to: 'OUT',
    rate: g.rate,
  }))
  // 同一道多产物配方被几种物品同时选中（石墨烯、氢都选了石墨烯（高效）；精炼油当目标、氢也要用时的等离子精炼）：只开一组工厂，
  // 台数按缺得最多的那种算，这几种产物都直接供产线（unit.shared），多出来的跟着自己那条带一起送出（flow.extra）。
  // 轮到其中最后一种时几种的需求都齐了（后序倒过来走，用它们的都在前面），这组在那时开；配方的原料是它们共同的下游，排在更后面
  const sharers = new Map<Recipe, number[]>()
  for (const [id, r] of recipeFor) {
    if (!r || r.outputs.length < 2) continue
    const group = sharers.get(r)
    if (group) group.push(id)
    else sharers.set(r, [id])
  }
  const order = post.slice().reverse()
  const lastOf = new Map<Recipe, number>()
  for (const id of order) {
    const r = recipeFor.get(id)
    if (r && (sharers.get(r)?.length ?? 0) > 1) lastOf.set(r, id)
  }
  for (const id0 of order) {
    const r = recipeFor.get(id0)
    const ids = r && lastOf.has(r) ? sharers.get(r) : null
    if (r && ids && lastOf.get(r) !== id0) continue
    const itemId = ids && r ? r.outputs.find((o) => ids.includes(o.id))!.id : id0
    let need = demand.get(itemId) || 0
    if (!ids && need <= EPS) continue
    if (!r) {
      rawSupply.push({ itemId, item: item(itemId).name, rate: need })
      continue
    }
    const f = chooseFactory(r)
    // 喷增产剂：最终产物那道吃到——能增产的按增产，只能加速的按加速
    // （数据里 proliferator & 2 能增产、& 1 能加速：反物质质能储存、X 射线裂解这类只能加速）
    const fed = !sprayed || (goalIds.has(itemId) && canSpray(r))
    const mode =
      eff && fed && r.inputs.length > 0
        ? r.proliferator & 2
          ? 'extra'
          : r.proliferator & 1
            ? 'speed'
            : null
        : null
    const outMul = mode === 'extra' && eff ? 1 + eff.extra : 1
    const speedMul = mode === 'speed' && eff ? 1 + eff.speed : 1
    const out = (r.outputs.find((o) => o.id === itemId) ?? r.outputs[0]).count * outMul
    const countOf = (id: number) => r.outputs.find((o) => o.id === id)!.count * outMul
    if (ids) {
      const crafts = Math.max(...ids.map((id) => (demand.get(id) || 0) / countOf(id)))
      if (crafts <= EPS) continue
      need = crafts * out // 主产物实际出多少（可能比要的多）
    }
    if (f.speed == null) throw new Error(`「${f.name}」不能生产「${r.name}」`)
    const perFactory = (out * 60 * f.speed * speedMul) / r.time
    const exact = need / perFactory
    const unit = makeUnit(
      `g${units.length}`,
      itemId,
      r,
      f,
      exact,
      need,
      mode ? { mode, outMul, speedMul } : null,
      labStack,
    )
    if (ids) unit.shared = ids.filter((id) => id !== itemId)
    units.push(unit)
    // 几种产物都供产线的：比要的多出来的跟着那条带送出
    if (ids)
      for (const id of ids) {
        const extra = (need / out) * countOf(id) - (demand.get(id) || 0)
        if (extra > 1e-6)
          flows.push({ itemId: id, from: 'RAW', to: 'OUT', rate: extra, extra: true })
      }
    // 副产物：按主产物的产量折算，单独一股流送到出口
    for (const o of r.outputs) {
      if (o.id === itemId || ids?.includes(o.id)) continue
      const rate = (need / out) * o.count * outMul
      byproducts.push({ itemId: o.id, item: item(o.id).name, rate, from: unit.id, of: itemId })
      flows.push({ itemId: o.id, from: unit.id, to: 'OUT', rate, byproduct: true })
    }
    for (const inp of r.inputs) {
      const inRate = (need / out) * inp.count
      demand.set(inp.id, (demand.get(inp.id) || 0) + inRate)
      if (fed) sprayFlow += inRate
      flows.push({ itemId: inp.id, from: 'RAW', to: unit.id, rate: inRate })
    }
  }
  // 回填每条流的来源：生产该物品的配方组，或 'RAW'
  const producerOf = new Map(
    units.flatMap((u) => [u.itemId, ...(u.shared ?? [])].map((id) => [id, u.id] as const)),
  )
  for (const fl of flows) if (!fl.byproduct) fl.from = producerOf.get(fl.itemId) || 'RAW'
  // 增产剂用量：进吃到增产的工厂的料都喷过，一个增产剂喷 sprays 个
  const sprayInfo =
    eff && sprayed
      ? {
          ...eff,
          rate: sprayFlow / eff.sprays,
          items: [...sprayed],
          to: units.filter((u) => u.spray).map((u) => u.id),
        }
      : null
  return finish({ units, raw: rawSupply, byproducts, flows, spray: sprayInfo })
}
