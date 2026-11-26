export const pillIcons: Record<string, string> = {
  power: '<path d="M9.5 1.5L3.5 9h4l-1 5.5 6-7.5h-4z"/>', // 闪电
  logistics: '<path d="M8 1.5l5.5 3v7L8 14.5l-5.5-3v-7zM2.5 4.5L8 7.5l5.5-3M8 7.5v7"/>', // 箱子
  belt: '<path d="M1.5 8h13M11 4.5L14.5 8 11 11.5"/>', // 带箭头的横线
  sorter: '<path d="M2.5 13.5l3-9 4.9 3.8"/><circle cx="12" cy="9.5" r="2"/>', // 折一下的臂，头上一个小圆
  smelter:
    '<path d="M8 1.5c.5 2.7 4.5 4.4 4.5 8.5a4.5 4.5 0 0 1-9 0c0-1.8.7-3.2 1.8-4.2.3 1.4.9 2.3 1.9 2.8-.4-2.7-.1-5 .8-7.1z"/>', // 火苗
  assembler:
    '<circle cx="8" cy="8" r="3.8"/><path d="M8 4.2V1.6M8 11.8v2.6M11.3 6.1l2.25-1.3M11.3 9.9l2.25 1.3M4.7 6.1L2.45 4.8M4.7 9.9l-2.25 1.3"/>', // 齿轮
  chemical:
    '<path d="M5.5 1.5h5M6.5 1.5V6L2.7 12.6a1.2 1.2 0 0 0 1 1.9h8.6a1.2 1.2 0 0 0 1-1.9L9.5 6V1.5M4.2 10h7.6"/>', // 烧瓶
  lab: '<circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none"/><ellipse cx="8" cy="8" rx="6.5" ry="2.7" transform="rotate(-30 8 8)"/>', // 原子
  spray:
    '<g transform="rotate(-45 8 8)"><rect x="1.75" y="5.5" width="12.5" height="5" rx="2.5"/><path d="M8 5.5v5"/></g>', // 胶囊（增产剂）
}
