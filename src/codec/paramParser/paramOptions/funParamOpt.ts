import ParamOpt from './paramOpt.ts'
import type { FieldValue, Position } from './paramOpt.ts'

type Encode<T> = (value: T, view: DataView) => number
type Decode<T> = (word: number, view: DataView) => T

export default class FunParamOpt<T extends FieldValue> extends ParamOpt {
  constructor(
    pos: Position,
    public encode: Encode<T>,
    public decode: Decode<T>,
  ) {
    super(pos)
  }

  static override of(
    pos: Position,
    encode: Encode<number>,
    decode: Decode<number>,
  ): FunParamOpt<number>
  static override of<T extends FieldValue>(
    pos: Position,
    encode: Encode<T>,
    decode: Decode<T>,
  ): FunParamOpt<T>
  static override of<T extends FieldValue>(pos: Position, encode: Encode<T>, decode: Decode<T>) {
    return new FunParamOpt(pos, encode, decode)
  }

  override setParam(view: DataView, value: T) {
    super.setParam(view, this.encode(value, view))
  }

  override getParam(view: DataView) {
    return this.decode(this.readWord(view), view)
  }
}
