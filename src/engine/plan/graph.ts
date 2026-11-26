import type { Calculation, Flow, ProductionUnit } from '../calc/calculator.js'
// 生产图：配方组（同一配方的一排工厂）+ 物品流。规划器只认这个结构。
import {
  factory,
  recipe as recipeOf,
  item as itemOf,
  BYPRODUCT,
  STORE_COPY,
  realItem,
  plannable,
} from '../gamedata.js'
import type { Factory } from '../gamedata.js'
import type { Graph, Group, ItemFlow } from './domain.js'

const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
/** 工厂上下两侧里有槽位的列数少的那一侧（一般 3，对撞机 2） */
const slotCols = (f: Factory) =>
  Math.min(Object.keys(f.slots?.bottom ?? {}).length, Object.keys(f.slots?.top ?? {}).length) || 3
/**
 * 研究站一叠要接的物品（原料 + 产物）比上下两侧的分拣器位多（宇宙矩阵 6 进 1 出，上下各 3 个位）：产物改从左右两侧出
 * （game-rules 第 40 条），返回产物的编号，否则 null。只认一种产物、产物只送成品出口的（宇宙矩阵就是）。这种组每台右边多留一列（间距 6），
 * 两台中间那一列夹一条带（layout/belts.js 的 labGaps），上下两侧只接原料
 */
function sideItemOf(
  f: Factory,
  r: { inputs: { id: number }[]; outputs: { id: number }[] },
  u: ProductionUnit,
  flows: Flow[],
) {
  if (f.kind !== 'lab' || u.store || r.outputs.length !== 1) return null
  const n = Object.keys(f.slots.bottom).length + Object.keys(f.slots.top).length
  if (r.inputs.length + r.outputs.length <= n) return null
  const outs = flows.filter((fl) => fl.from === u.id && !fl.byproduct)
  return outs.length && outs.every((fl) => fl.to === 'OUT' && fl.itemId === u.itemId)
    ? u.itemId
    : null
}
const ITEM_LETTERS = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** 按物品流连接每个配方组，保留副产物和储物仓各自的带子编号。 */
export function buildGraph(calc: Calculation): Graph {
  // 同一种副产物有几组工厂在出（信息矩阵的石墨烯选可燃冰：等离子精炼、石墨烯（高效）都出氢）：生产图里一种物品只记一个生产者，
  // 编号一样的话后一组盖掉前一组、带上只有它那份。第二组起换个编号（STORE_COPY，同箱子供货的仓），各走各的带；
  // 出蓝图、接站按真实物品（realItem），进站还是同一格
  const byKeys = new Map<string, number>()
  const byCount = new Map<number, number>()
  for (const fl of calc.flows) {
    if (!fl.byproduct || byKeys.has(`${fl.from}:${fl.itemId}`)) continue
    const k = byCount.get(fl.itemId) ?? 0
    byCount.set(fl.itemId, k + 1)
    byKeys.set(`${fl.from}:${fl.itemId}`, STORE_COPY * k + BYPRODUCT + fl.itemId)
  }
  const byKey = (from: string | null, itemId: number) =>
    byKeys.get(`${from}:${itemId}`) ?? BYPRODUCT + itemId
  const ordinaryOutputs = new Set(
    calc.flows.filter((f) => !f.byproduct).map((f) => `${f.from}:${f.itemId}`),
  )
  const groups = calc.units.map((u, i): Group => {
    const f = factory(u.factoryId, calc.latitude, u.recipeId)
    if (!f.supported || !plannable(u.recipeId, u.factoryId)) {
      const e = Object.assign(
        new Error(
          `「${u.item}」需要${f.name}（${u.recipe}），布局器暂时不支持这种工厂或配方，可以把它设为外部供应。`,
        ),
        { item: u.item, code: 'UNSUPPORTED_FACTORY' },
      )
      throw e
    }
    // 箱子供货的储物仓（plan/storage.js 的 storeUnits）：没有配方，「储物仓供货」一叠往带上放 rate ÷ 叠数，「储物仓收货」只取不放；
    // 一叠算一台，levels 是叠几层（只管出蓝图、画图，不乘产量）
    const st = u.store
    const speed = f.speed ?? 0 // 储物仓的流量由供货量决定，不使用配方速度。
    const key = st?.byproduct ? BYPRODUCT + u.itemId : u.itemId
    const r: { inputs: { id: number }[]; outputs: { id: number; count: number }[]; time: number } =
      st
        ? {
            inputs: st.kind === 'out' ? [{ id: key }] : [],
            outputs: st.kind === 'in' ? [{ id: u.itemId, count: 1 }] : [],
            time: 1,
          }
        : recipeOf(u.recipeId)
    // 研究站一叠 levels 台，规划里把一叠当一台：每「台」的产量乘层数
    const levels = f.kind === 'lab' || st ? (u.levels ?? 1) : 1
    // 喷了增产剂的配方：增产多出产物、加速整体快（见 calculator.js）
    const outMul = u.spray?.outMul ?? 1
    const speedMul = u.spray?.speedMul ?? 1
    const rateOf = st
      ? () => st.rate / u.count
      : (o: { count: number }) => (o.count * outMul * 60 * speed * speedMul * levels) / r.time // 个/分钟
    const perFactory = rateOf(r.outputs.find((o) => o.id === u.itemId) ?? r.outputs[0])
    // 产物：主产物 + 副产物（副产物在生产图里的编号是 BYPRODUCT + 真实编号，单独一条带；别的组也出这种副产物时见上面 byKey）
    // 和主产物一起供产线的（u.shared，同一道配方被几种物品同时选中，calculator.js）也是正经产物
    const outputs = r.outputs.map((o) => ({
      itemId:
        o.id === u.itemId || u.shared?.includes(o.id) || ordinaryOutputs.has(`${u.id}:${o.id}`)
          ? o.id
          : byKey(u.id, o.id),
      perFactory: rateOf(o),
    }))
    const sideItem = sideItemOf(f, r, u, calc.flows)
    const pitch = sideItem == null ? f.pitch : f.pitch + 1 // 夹带的组每台右边多一列（中心隔 6）
    return {
      id: u.id,
      letter: GROUP_LETTERS[i] ?? `G${i}`,
      itemId: u.itemId,
      item: u.item,
      recipeId: u.recipeId,
      inputs: r.inputs.map((x) => u.inputKeys?.[x.id] ?? x.id), // inputKeys：原料分给这组单用的那组仓（编号见 gamedata.js 的 STORE_COPY）
      factoryId: f.id,
      factory: f.name,
      kind: f.kind,
      pitch,
      center: f.center,
      trailing: f.trailing,
      bodyWidth: f.bodyWidth,
      bodyHeight: f.bodyHeight,
      bodyBelow: f.bodyBelow,
      bodyAbove: f.bodyAbove,
      edgeBelow: f.edgeBelow,
      edgeAbove: f.edgeAbove,
      edgeShiftBelow: f.edgeShiftBelow,
      slots: f.slots,
      tap: f.tap ?? 0,
      slotPos: f.slotPos ?? null,
      collider: f.collider,
      colliderShift: f.colliderShift,
      ...(f.yaw ? { yaw: f.yaw } : null),
      ...(f.latitude ? { latitude: f.latitude } : null), // 化工厂、量子化工厂、精炼厂按哪套间距排：high 加宽、equator 赤道压缩
      levels,
      levelZ: f.levelZ ?? 0,
      // 一侧可用的分拣器列（中心 −1/0/+1）折算成和间距可比的数；对撞机每侧只有 2 列有槽位，就按 2 算；夹带的研究站多出来那列不放分拣器，按 3
      colCap: slotCols(f) < 3 || st || sideItem != null ? slotCols(f) : Math.min(f.pitch, 4),
      ...(f.slots && !Object.keys(f.slots.top ?? {}).length ? { noTop: true } : null), // 上侧没有口（精炼厂）：只挂下面那条通道
      ...(sideItem != null ? { sideItem } : null), // 产物从左右两侧出、走两台中间的夹带（见 sideItemOf）
      count: u.count,
      width: u.count * pitch + f.trailing,
      perFactory,
      outputs,
      crafts: st ? null : (60 * speed * speedMul * levels) / r.time, // 每台（一叠）每分钟跑几次配方：页面上工厂小窗算原料用量
      outputRate: u.outputRate,
      ...(st ? { store: { ...st, key } } : null),
    }
  })
  const byId = new Map(groups.map((g) => [g.id, g]))

  const items = new Map<number, ItemFlow>()
  let li = 0
  const flowOf = (itemId: number, by: boolean | undefined, from: string) => {
    const key = by ? byKey(from, itemId) : itemId
    if (!items.has(key)) {
      items.set(key, {
        itemId: key,
        real: realItem(itemId),
        byproduct: !!by,
        name: itemOf(realItem(itemId)).name + (by ? '（副产）' : ''),
        letter: ITEM_LETTERS[li++] ?? '?',
        producer: from,
        consumers: [],
        rate: 0,
      })
    }
    return items.get(key)!
  }
  for (const fl of calc.flows) {
    const f = flowOf(fl.itemId, fl.byproduct, fl.from)
    if (fl.from !== 'RAW') {
      const group = byId.get(fl.from)
      if (!group) throw new Error(`物品「${f.name}」的生产组缺失：${fl.from}`)
      const perFactory =
        group.outputs.find((o) => o.itemId === f.itemId)?.perFactory ?? group.perFactory
      if (fl.from === f.producer) f.perFactory = perFactory
      else {
        if (f.producer === 'RAW') throw new Error(`「${f.name}」目前不能混用外供和自产`)
        f.producerRates ??= new Map([[f.producer, f.perFactory!]])
        f.producerRates.set(fl.from, perFactory)
      }
    } else if (f.producer !== 'RAW') {
      throw new Error(`「${f.name}」目前不能混用外供和自产`)
    }
    const consumer = f.consumers.find(({ to }) => to === fl.to)
    if (consumer) consumer.rate += fl.rate
    else f.consumers.push({ to: fl.to, rate: fl.rate })
    f.rate += fl.rate
  }
  const edges = calc.flows.map(({ itemId, from, to, rate }) => ({
    itemId: realItem(itemId),
    from,
    to,
    rate,
  }))
  return { groups, byId, edges, items, target: calc.targetId }
}

/** 给回流组分同一层；只在强连通分量之间计算最长依赖路径。 */
export function layers({ groups, edges }: Pick<Graph, 'groups' | 'edges'>): Map<string, number> {
  const upstream = new Map(groups.map(({ id }) => [id, new Set<string>()]))
  for (const { from, to } of edges) {
    if (from === 'RAW' || to === 'OUT' || from === to) continue
    const sources = upstream.get(to)
    if (!sources || !upstream.has(from)) throw new Error(`物流边的生产组缺失：${from} → ${to}`)
    sources.add(from)
  }

  // Tarjan：合并相互依赖的生产组。用入边遍历，使上游分量先出栈。
  const indices = new Map<string, number>()
  const stack: string[] = []
  const active = new Set<string>()
  const layer = new Map<string, number>()
  function visit(id: string): number {
    const index = indices.size
    indices.set(id, index)
    stack.push(id)
    active.add(id)
    let low = index
    for (const source of upstream.get(id)!) {
      const seen = indices.get(source)
      if (seen === undefined) low = Math.min(low, visit(source))
      else if (active.has(source)) low = Math.min(low, seen)
    }
    if (low !== index) return low

    const members: string[] = []
    let member: string
    do {
      member = stack.pop()!
      active.delete(member)
      members.push(member)
    } while (member !== id)

    let depth = 0
    for (const group of members) {
      for (const source of upstream.get(group)!) {
        const sourceDepth = layer.get(source)
        if (sourceDepth !== undefined) depth = Math.max(depth, sourceDepth + 1)
      }
    }
    for (const group of members) layer.set(group, depth)
    return low
  }
  for (const { id } of groups) if (!indices.has(id)) visit(id)
  return layer
}
