import { Schema } from "effect"

export const Difficulty = Schema.Number.check(Schema.isInt(), Schema.isGreaterThan(0)).pipe(
  Schema.brand("Difficulty")
)
export type Difficulty = typeof Difficulty.Type
