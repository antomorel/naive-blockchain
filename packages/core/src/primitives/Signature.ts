import { Schema } from "effect"

export const Signature = Schema.Uint8ArrayFromBase64.pipe(Schema.brand("Signature"))
export type Signature = typeof Signature.Type
