export type Position = number | ((view: DataView) => number)
export type FieldValue = number | boolean | number[]

/** 一个参数占一个小端 int32；部分建筑的偏移由前面的参数决定。 */
export default class ParamOpt {
  constructor(public pos: Position) {}

  static of(pos: Position, ..._options: never[]): ParamOpt {
    return new ParamOpt(pos)
  }

  protected position(view: DataView) {
    return typeof this.pos === 'function' ? this.pos(view) : this.pos
  }

  setParam(view: DataView, value: unknown) {
    setParam(view, this.position(view), Number(value))
  }

  protected readWord(view: DataView) {
    return getParam(view, this.position(view))
  }

  getParam(view: DataView): FieldValue {
    return this.readWord(view)
  }
}

export function setParam(view: DataView, pos: number, value: number) {
  view.setInt32(pos * Int32Array.BYTES_PER_ELEMENT, value, true)
}

export function getParam(view: DataView, pos: number) {
  return view.getInt32(pos * Int32Array.BYTES_PER_ELEMENT, true)
}
