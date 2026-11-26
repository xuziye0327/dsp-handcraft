import * as pako from 'pako'

import { itemsMap } from './itemsUtil.ts'
import { digest } from './md5.ts'
import { getParamParser } from './paramParser/paramParserFactory.ts'
import type { Area, Blueprint, Building, Point3 } from './types.ts'

class BufferIO {
  pos = 0
  constructor(readonly view: DataView) {}
  getView(length: number) {
    const r = new DataView(this.view.buffer, this.view.byteOffset + this.pos, length)
    this.pos += length
    return r
  }
}
class BufferReader extends BufferIO {
  getUint8() {
    const v = this.view.getUint8(this.pos)
    this.pos += 1
    return v
  }
  getInt8() {
    const v = this.view.getInt8(this.pos)
    this.pos += 1
    return v
  }
  getInt16() {
    const v = this.view.getInt16(this.pos, true)
    this.pos += 2
    return v
  }
  getInt32() {
    const v = this.view.getInt32(this.pos, true)
    this.pos += 4
    return v
  }
  getFloat32() {
    const v = this.view.getFloat32(this.pos, true)
    this.pos += 4
    return v
  }
}
class BufferWriter extends BufferIO {
  setUint8(value: number) {
    this.view.setUint8(this.pos, value)
    this.pos += 1
  }
  setInt8(value: number) {
    this.view.setInt8(this.pos, value)
    this.pos += 1
  }
  setInt16(value: number) {
    this.view.setInt16(this.pos, value, true)
    this.pos += 2
  }
  setInt32(value: number) {
    this.view.setInt32(this.pos, value, true)
    this.pos += 4
  }
  setFloat32(value: number) {
    this.view.setFloat32(this.pos, value, true)
    this.pos += 4
  }
}
function btoUint8Array(b: string) {
  const arr = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) {
    arr[i] = b.charCodeAt(i)
  }
  return arr
}
function Uint8ArrayTob(a: Uint8Array) {
  let out = ''
  for (let i = 0; i < a.length; i++) {
    out += String.fromCharCode(a[i]!)
  }
  return out
}
const uint8ToHex = new Array<string>(0x100)
for (let i = 0; i < uint8ToHex.length; i++) {
  uint8ToHex[i] = i.toString(16).toUpperCase().padStart(2, '0')
}
function hex(buffer: ArrayBuffer) {
  const view = new Uint8Array(buffer)
  const hexBytes = new Array<string>(view.length)
  for (let i = 0; i < view.length; i++) {
    hexBytes[i] = uint8ToHex[view[i]!]!
  }
  return hexBytes.join('')
}
function importArea(r: BufferReader): Area {
  return {
    index: r.getInt8(),
    parentIndex: r.getInt8(),
    tropicAnchor: r.getInt16(),
    areaSegments: r.getInt16(),
    anchorLocalOffset: {
      x: r.getInt16(),
      y: r.getInt16(),
    },
    size: {
      x: r.getInt16(),
      y: r.getInt16(),
    },
  }
}
function exportArea(w: BufferWriter, area: Area) {
  w.setInt8(area.index)
  w.setInt8(area.parentIndex)
  w.setInt16(area.tropicAnchor)
  w.setInt16(area.areaSegments)
  w.setInt16(area.anchorLocalOffset.x)
  w.setInt16(area.anchorLocalOffset.y)
  w.setInt16(area.size.x)
  w.setInt16(area.size.y)
}

type Geometry = Pick<
  Building,
  | 'index'
  | 'itemId'
  | 'modelIndex'
  | 'areaIndex'
  | 'localOffset'
  | 'yaw'
  | 'tilt'
  | 'pitch'
  | 'tilt2'
  | 'pitch2'
>

function importBuilding(r: BufferReader): Building {
  function fix(num: number) {
    // 保留4位小数
    return +num.toFixed(4) || 0
  }
  function readXYZ() {
    return {
      x: fix(r.getFloat32()),
      y: fix(r.getFloat32()),
      z: fix(r.getFloat32()),
    }
  }
  const num = r.getInt32()
  let geometry: Geometry
  if (num <= -101) {
    // -101 起按建筑种类省略重复的端点和角度。
    const index = r.getInt32()
    const itemId = r.getInt16()
    const modelIndex = r.getInt16()
    const areaIndex = r.getInt8()
    const start = readXYZ()
    const heading = fix(r.getFloat32())
    const belt = itemId > 2000 && itemId < 2010
    const sorter = itemId > 2010 && itemId < 2020
    const tilt = belt || sorter ? r.getFloat32() : 0
    const pitch = sorter ? r.getFloat32() : 0
    geometry = {
      index,
      itemId,
      modelIndex,
      areaIndex,
      localOffset: [start, sorter ? readXYZ() : { ...start }],
      yaw: [heading, sorter ? fix(r.getFloat32()) : heading],
      tilt,
      pitch,
      tilt2: sorter ? r.getFloat32() : tilt,
      pitch2: sorter ? r.getFloat32() : 0,
    }
  } else {
    // 老格式总有两个端点；-100 增加倾斜角，但尚无俯仰角和第二端倾斜角。
    geometry = {
      index: num === -100 ? r.getInt32() : num,
      areaIndex: r.getInt8(),
      localOffset: [readXYZ(), readXYZ()],
      yaw: [fix(r.getFloat32()), fix(r.getFloat32())],
      tilt: num === -100 ? r.getFloat32() : 0,
      tilt2: 0,
      pitch: 0,
      pitch2: 0,
      itemId: r.getInt16(),
      modelIndex: r.getInt16(),
    }
  }
  const b: Building = {
    parameters: null,
    ...geometry,
    outputObjIdx: r.getInt32(),
    inputObjIdx: r.getInt32(),
    outputToSlot: r.getInt8(),
    inputFromSlot: r.getInt8(),
    outputFromSlot: r.getInt8(),
    inputToSlot: r.getInt8(),
    outputOffset: r.getInt8(),
    inputOffset: r.getInt8(),
    recipeId: r.getInt16(),
    filterId: r.getInt16(),
    itemName: itemsMap.get(geometry.itemId)?.name || `未知物品_${geometry.itemId}`,
  }
  // 游戏 0.10.35 起前缀是 -102，每个建筑多了 4 个字节（dsp-handcraft 按用户贴的蓝图逆推，含义未知）。
  // 只确定它在 filterId 之后；在参数长度之前还是参数之后看不出来，两种都试，挑下一个建筑前缀对得上的那种
  let extraFirst = false
  if (num <= -102) {
    const p = r.pos
    const view = r.view
    const marker = (at: number) => at + 4 > view.byteLength || view.getInt32(at, true) <= -100
    const lenX = view.getInt16(p, true)
    const endX = p + 2 + Math.max(0, lenX) * 4 + 4
    const lenY = p + 6 <= view.byteLength ? view.getInt16(p + 4, true) : 0
    const endY = p + 4 + 2 + Math.max(0, lenY) * 4
    extraFirst = !marker(endX) && marker(endY)
    if (extraFirst) b.extra102 = r.getInt32()
  }
  const length = r.getInt16()
  if (length > 0) {
    const v = r.getView(length * Int32Array.BYTES_PER_ELEMENT)
    b.parameters = getParamParser(b.itemId).decode(v)
  }
  if (num <= -102 && !extraFirst) b.extra102 = r.getInt32()
  return b
}
function exportBuilding(w: BufferWriter, b: Building) {
  function writeXYZ(v: Point3) {
    w.setFloat32(v.x)
    w.setFloat32(v.y)
    w.setFloat32(v.z)
  }
  // 和原生成器一样统一写 -101，即使读入的是其他版本。
  w.setInt32(-101)
  w.setInt32(b.index)
  w.setInt16(b.itemId)
  w.setInt16(b.modelIndex)
  w.setInt8(b.areaIndex)
  writeXYZ(b.localOffset[0])
  w.setFloat32(b.yaw[0])
  if (b.itemId > 2000 && b.itemId < 2010) {
    // 传送带参数
    w.setFloat32(b.tilt)
  } else if (b.itemId > 2010 && b.itemId < 2020) {
    // 分拣器参数
    w.setFloat32(b.tilt)
    w.setFloat32(b.pitch)
    writeXYZ(b.localOffset[1])
    w.setFloat32(b.yaw[1])
    w.setFloat32(b.tilt2)
    w.setFloat32(b.pitch2)
  }
  w.setInt32(b.outputObjIdx)
  w.setInt32(b.inputObjIdx)
  w.setInt8(b.outputToSlot)
  w.setInt8(b.inputFromSlot)
  w.setInt8(b.outputFromSlot)
  w.setInt8(b.inputToSlot)
  w.setInt8(b.outputOffset)
  w.setInt8(b.inputOffset)
  w.setInt16(b.recipeId)
  w.setInt16(b.filterId)
  if (b.parameters !== null) {
    const parser = getParamParser(b.itemId)
    const length = parser.getLength(b.parameters)
    w.setInt16(length)
    parser.encode(b.parameters, w.getView(length * Int32Array.BYTES_PER_ELEMENT))
  } else {
    w.setInt16(0)
  }
}
const START = 'BLUEPRINT:'
const TIME_BASE = new Date(0).setUTCFullYear(1)
export function fromStr(strData: string): Blueprint<Date> {
  if (!strData.startsWith(START)) throw Error('Invalid start')
  const p1 = strData.indexOf('"', START.length)
  const cells = strData.substring(START.length, p1).split(',')
  if (cells.length < 12) throw Error('Header too short')
  const header = {
    layout: parseInt(cells[1]!),
    icons: cells.slice(2, 7).map((s) => parseInt(s)),
    time: new Date(TIME_BASE + parseInt(cells[8]!) / 10000),
    gameVersion: cells[9]!,
    shortDesc: decodeURIComponent(cells[10]!),
    desc: decodeURIComponent(cells[11]!),
  }
  const p2 = strData.length - 33
  if (strData[p2] !== '"') throw Error('Checksum not found')
  const d = hex(digest(btoUint8Array(strData.substring(0, p2)).buffer))
  const expectedD = strData.substring(p2 + 1)
  if (d !== expectedD) throw Error('Checksum mismatch')
  const encoded = strData.substring(p1 + 1, p2)
  const decoded = pako.ungzip(btoUint8Array(atob(encoded)))
  const reader = new BufferReader(
    new DataView(decoded.buffer, decoded.byteOffset, decoded.byteLength),
  )
  const meta = {
    version: reader.getInt32(),
    cursorOffset: {
      x: reader.getInt32(),
      y: reader.getInt32(),
    },
    cursorTargetArea: reader.getInt32(),
    dragBoxSize: {
      x: reader.getInt32(),
      y: reader.getInt32(),
    },
    primaryAreaIdx: reader.getInt32(),
  }
  const numAreas = reader.getUint8()
  const areas = []
  for (let i = 0; i < numAreas; i++) areas.push(importArea(reader))
  const numBuildings = reader.getInt32()
  const buildings = []
  for (let i = 0; i < numBuildings; i++) buildings.push(importBuilding(reader))
  return {
    header,
    ...meta,
    areas,
    buildings,
  }
}
function encodedSize(bp: Blueprint) {
  // 原生成器按最长的建筑记录预留空间；尾部的零也属于压缩数据。
  let result =
    28 + // meta
    1 + // numAreas
    14 * bp.areas.length +
    4 + // numBuildings
    81 * bp.buildings.length
  for (const b of bp.buildings) {
    if (b.parameters === null) continue
    const parser = getParamParser(b.itemId)
    result += parser.getLength(b.parameters) * Int32Array.BYTES_PER_ELEMENT
  }
  return result
}
export function toStr(bp: Blueprint) {
  let result = START
  result += '0,'
  result += bp.header.layout
  result += ','
  for (const i of bp.header.icons) {
    result += i
    result += ','
  }
  result += '0,'
  result += (new Date(bp.header.time).getTime() - TIME_BASE) * 10000
  result += ','
  result += bp.header.gameVersion
  result += ','
  result += encodeURIComponent(bp.header.shortDesc)
  result += ','
  result += encodeURIComponent(bp.header.desc)
  result += '"'
  const decoded = new Uint8Array(encodedSize(bp))
  const writer = new BufferWriter(new DataView(decoded.buffer))
  writer.setInt32(bp.version)
  writer.setInt32(bp.cursorOffset.x)
  writer.setInt32(bp.cursorOffset.y)
  writer.setInt32(bp.cursorTargetArea)
  writer.setInt32(bp.dragBoxSize.x)
  writer.setInt32(bp.dragBoxSize.y)
  writer.setInt32(bp.primaryAreaIdx)
  writer.setUint8(bp.areas.length)
  for (const a of bp.areas) exportArea(writer, a)
  writer.setInt32(bp.buildings.length)
  for (const b of bp.buildings) exportBuilding(writer, b)
  result += btoa(Uint8ArrayTob(pako.gzip(decoded)))
  const d = hex(digest(btoUint8Array(result).buffer))
  result += '"'
  result += d
  return result
}
