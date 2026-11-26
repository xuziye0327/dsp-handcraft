import ParamOpt from './paramOpt.ts'
import type { Position } from './paramOpt.ts'

export default class BoolParamOpt extends ParamOpt {
  constructor(
    pos: Position,
    public trueValue = 1,
    public falseValue = -1,
  ) {
    super(pos)
  }

  static override of(pos: Position, trueValue = 1, falseValue = -1) {
    return new BoolParamOpt(pos, trueValue, falseValue)
  }

  override setParam(view: DataView, value: unknown) {
    super.setParam(view, value === true ? this.trueValue : value === false ? this.falseValue : value)
  }

  override getParam(view: DataView) {
    const word = this.readWord(view)
    return word === this.trueValue ? true : word === this.falseValue ? false : word
  }
}
