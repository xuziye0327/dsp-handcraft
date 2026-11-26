import { PORT_POSITIONS } from '../../engine/plan/port-position.js'

const portChoices = [
  { value: '', text: '自动' },
  ...Object.entries(PORT_POSITIONS).map(([value, { text }]) => ({ value, text })),
]

export interface Choice {
  value: string
  text: string
  pill?: string
  note?: string
  hidden?: boolean
}
export interface OptionGroup {
  title: string
  choices: Choice[]
  hint?: string
}
export const options = {
  effort: {
    title: '搜索力度',
    choices: [
      {
        value: 'normal',
        text: '标准',
      },
      {
        value: 'fine',
        text: '美观',
      },
    ],
  },
  inlet: { title: '材料入口方位', choices: portChoices },
  outlet: { title: '最终产物出口方位', choices: portChoices },
  supply: {
    title: '箱子',
    choices: [
      {
        value: '',
        text: '不用',
        hidden: true,
      },
      {
        value: 'side-s',
        text: '小型储物仓',
      },
      {
        value: 'side-l',
        text: '大型储物仓',
      },
    ],
    hint: '仓都排在产线左侧一列：原料从仓出、成品进仓，矿照旧从左边送入',
  },
  dist: {
    title: '物流配送器',
    choices: [
      {
        value: '0',
        text: '不放',
      },
      {
        value: '1',
        text: '放在仓顶',
      },
    ],
  },
  fracengine: {
    title: '分馏阵列排法',
    choices: [
      {
        value: 'template',
        text: '照原图裁剪',
      },
      {
        value: 'anneal',
        text: '站在上、方形（新）',
      },
    ],
    hint: '新排法还没进游戏验过',
  },
  warper: {
    title: '翘曲器格（星际需求）',
    choices: [
      {
        value: '1',
        text: '整张一格',
      },
      {
        value: '0',
        text: '不放',
      },
    ],
  },
  chemwide: {
    title: '化工厂、精炼厂高纬度间距展开',
    choices: [
      {
        value: '0',
        text: '关（只限赤道）',
      },
      {
        value: '1',
        text: '开（任何纬度）',
      },
    ],
  },
  maxwidth: {
    title: '宽度上限',
    choices: [
      {
        value: '25',
        text: '25',
      },
      {
        value: '50',
        text: '50',
      },
      {
        value: '100',
        text: '100',
      },
    ],
  },
  maxheight: {
    title: '长度上限',
    choices: [
      {
        value: '25',
        text: '25',
      },
      {
        value: '50',
        text: '50',
      },
      {
        value: '100',
        text: '100',
      },
    ],
  },
  aspect: {
    title: '长宽比上限',
    choices: [
      {
        value: '',
        text: '不限',
      },
      {
        value: '3',
        text: '3 : 1',
      },
      {
        value: '2',
        text: '2 : 1',
      },
    ],
  },
  assembler: {
    title: '制造台',
    choices: [
      {
        value: '2303',
        text: 'Mk.I',
        pill: 'Mk.I 制造台',
      },
      {
        value: '2304',
        text: 'Mk.II',
        pill: 'Mk.II 制造台',
      },
      {
        value: '2305',
        text: 'Mk.III',
        pill: 'Mk.III 制造台',
      },
      {
        value: '2318',
        text: '重组式',
        pill: '重组式制造台',
      },
    ],
  },
  smelter: {
    title: '熔炉',
    choices: [
      {
        value: '2302',
        text: '电弧',
        pill: '电弧熔炉',
      },
      {
        value: '2315',
        text: '位面',
        pill: '位面熔炉',
      },
      {
        value: '2319',
        text: '负熵',
        pill: '负熵熔炉',
      },
    ],
  },
  chemical: {
    title: '化工厂',
    choices: [
      {
        value: '2309',
        text: '化工厂',
        pill: '化工厂',
      },
      {
        value: '2317',
        text: '量子化工厂',
        pill: '量子化工厂',
      },
    ],
  },
  lab: {
    title: '研究站',
    choices: [
      {
        value: '2901',
        text: '矩阵',
        pill: '矩阵研究站',
      },
      {
        value: '2902',
        text: '自演化',
        pill: '自演化研究站',
      },
    ],
  },
  belt: {
    title: '传送带',
    choices: [
      {
        value: '1',
        text: '普通',
        pill: '普通传送带',
      },
      {
        value: '2',
        text: '高速',
        pill: '高速传送带',
      },
      {
        value: '3',
        text: '极速',
        pill: '极速传送带',
      },
    ],
  },
  sorter: {
    title: '分拣器',
    choices: [
      {
        value: '2011',
        text: '普通',
        pill: '普通分拣器',
      },
      {
        value: '2012',
        text: '高速',
        pill: '高速分拣器',
      },
      {
        value: '2013',
        text: '极速',
        pill: '极速分拣器',
      },
      {
        value: '2014',
        text: '集装',
        pill: '集装分拣器',
      },
    ],
  },
  logistics: {
    title: '物流方式',
    choices: [
      {
        value: '',
        text: '传送带',
        pill: '普通物流',
      },
      {
        value: 'box',
        text: '传送带+箱子',
        pill: '箱子存储',
      },
      {
        value: 'station',
        text: '物流站',
        pill: '物流站',
      },
    ],
  },
  station: {
    title: '物流站',
    choices: [
      {
        value: '',
        text: '不接',
        hidden: true,
      },
      {
        value: 'ils',
        text: '星际物流站（放进空地）',
      },
    ],
  },
  power: {
    title: '供电',
    choices: [
      {
        value: '',
        text: '不放',
        pill: '不配电',
      },
      {
        value: 'tesla',
        text: '电力感应塔',
        pill: '电力塔',
      },
      {
        value: 'substation',
        text: '卫星配电站',
        pill: '卫星站',
      },
    ],
  },
  spray: {
    title: '喷增产剂',
    choices: [
      {
        value: '0',
        text: '不喷',
        pill: '不增产',
      },
      {
        value: '1',
        text: 'Mk.I',
        pill: 'Mk.I 增产',
      },
      {
        value: '2',
        text: 'Mk.II',
        pill: 'Mk.II 增产',
      },
      {
        value: '3',
        text: 'Mk.III',
        pill: 'Mk.III 增产',
      },
    ],
  },
  pilertech: {
    title: '集装分拣器改良科技水平',
    choices: [
      {
        value: '0',
        text: '未研究（默认）',
      },
      {
        value: '1',
        text: '1 级',
        note: '叠 2 层',
      },
      {
        value: '2',
        text: '2 级',
        note: '一趟 3 个',
      },
      {
        value: '3',
        text: '3 级',
        note: '叠 3 层',
      },
      {
        value: '4',
        text: '4 级',
        note: '一趟 4 个',
      },
      {
        value: '5',
        text: '5 级',
        note: '叠 4 层',
      },
      {
        value: '6',
        text: '6 级',
        note: '双向',
      },
    ],
  },
  pile: {
    title: '运输站集装物流',
    choices: [
      {
        value: '1',
        text: '未研究（默认）',
      },
      {
        value: '2',
        text: '1 级',
        note: '叠 2 层',
      },
      {
        value: '3',
        text: '2 级',
        note: '叠 3 层',
      },
      {
        value: '4',
        text: '3 级',
        note: '叠 4 层',
      },
    ],
  },
} satisfies Record<string, OptionGroup>
export type OptionName = keyof typeof options
export const groups: Record<OptionName, OptionGroup> = options
