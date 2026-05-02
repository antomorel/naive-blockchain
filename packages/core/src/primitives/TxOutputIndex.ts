import { Schema } from "effect";

export const TxOutputIndex = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0)
).pipe(Schema.brand("TxOutputIndex"));
export type TxOutputIndex = typeof TxOutputIndex.Type;
