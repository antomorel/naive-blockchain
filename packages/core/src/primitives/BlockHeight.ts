import { Schema } from "effect"

export const BlockHeight = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0)
).pipe(Schema.brand("BlockHeight"))
export type BlockHeight = typeof BlockHeight.Type
