import { Schema } from "effect";

export const Nonce = Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)).pipe(
  Schema.brand("Nonce")
);
export type Nonce = typeof Nonce.Type;
