// 整张蓝图绕原点顺时针转 90°。槽位跟着建筑一起转，连接关系不变。
import type { Blueprint, Point2, Point3 } from '../codec/types.ts'

/** 转一个点（转之前的宽 W） */
export const rotatePoint = (x: number, y: number, W: number): Point2 => ({ x: y, y: W - 1 - x })
/** 转一个方向向量 */
export const rotateVec = (dx: number, dy: number): [number, number] => [dy, -dx]

/** 就地把解码后的蓝图对象顺时针转 90° */
export function rotateBlueprint(bp: Blueprint): Blueprint {
  const { x: W, y: H } = bp.dragBoxSize
  const point = (o: Point3): Point3 => ({ ...rotatePoint(o.x, o.y, W), z: o.z })
  const yaw = (v: number) => (((v + 90) % 360) + 360) % 360
  for (const b of bp.buildings) {
    b.localOffset = [point(b.localOffset[0]), point(b.localOffset[1])]
    b.yaw = [yaw(b.yaw[0]), yaw(b.yaw[1])]
  }
  const size = { x: H, y: W }
  bp.dragBoxSize = size
  bp.cursorOffset = { x: Math.floor(size.x / 2), y: Math.floor(size.y / 2) }
  for (const a of bp.areas || []) a.size = size
  return bp
}
