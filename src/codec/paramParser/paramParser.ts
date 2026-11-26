import type { BuildingParameters } from '../types.ts'
import DefaultParamParser from './defaultParamParser.ts'
import ParamOpt from './paramOptions/paramOpt.ts'
import type { FieldValue } from './paramOptions/paramOpt.ts'

type Schema = ParamOpt | Schema[] | { [key: string]: Schema } | FieldValue | null
interface Fields {
  [key: string]: Schema
}
type Value = FieldValue | Value[] | { [key: string]: Value } | null

function deepEncode(schema: Schema, value: unknown, view: DataView): void {
  if (schema === null || typeof schema !== 'object') return
  if (schema instanceof ParamOpt) return schema.setParam(view, value)
  const fields =
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null
  for (const [key, child] of Object.entries<Schema>(schema)) {
    deepEncode(child, fields ? fields[key] : null, view)
  }
}

function deepDecode(schema: Schema, view: DataView): Value {
  if (schema === null || typeof schema !== 'object') return schema
  if (schema instanceof ParamOpt) return schema.getParam(view)
  if (Array.isArray(schema)) return schema.map((child) => deepDecode(child, view))
  return decodeFields(schema, view)
}

function decodeFields(fields: Fields, view: DataView) {
  return Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [k, deepDecode(v, view)] as const),
  )
}

export default class ParamParser extends DefaultParamParser {
  constructor(
    public size: number,
    public params: Fields | null,
  ) {
    super()
  }

  override getLength(p: BuildingParameters) {
    return this.size || super.getLength(p)
  }

  override encode(p: BuildingParameters, view: DataView) {
    if (!this.params) return super.encode(p, view)
    deepEncode(this.params, p, view)
  }

  override decode(view: DataView): BuildingParameters {
    return this.params ? decodeFields(this.params, view) : super.decode(view)
  }
}
