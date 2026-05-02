import { Schema } from "effect";

export const Amount = Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)).pipe(
  Schema.brand("Amount")
);
export type Amount = typeof Amount.Type;
