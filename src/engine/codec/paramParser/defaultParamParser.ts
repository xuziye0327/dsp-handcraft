import type { BuildingParameters } from '../types.ts'
import { getParam, setParam } from './paramOptions/paramOpt.ts'

/** 未知建筑的参数按原顺序保留。JSON 往返后，Int32Array 会变为以索引为键的对象。 */
export default class DefaultParamParser {
  getLength(p: BuildingParameters) {
    const words = p._defaultParams
    if (words instanceof Int32Array) return words.length
    return words ? Object.keys(words).length : 0
  }

  encode(p: BuildingParameters, view: DataView) {
    const length = this.getLength(p)
    for (let i = 0; i < length; i++) setParam(view, i, p._defaultParams![i]!)
  }

  decode(view: DataView): BuildingParameters {
    const words = new Int32Array(view.byteLength / Int32Array.BYTES_PER_ELEMENT)
    for (let i = 0; i < words.length; i++) words[i] = getParam(view, i)
    return { _defaultParams: words }
  }
}
