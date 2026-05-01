import { Schema } from "effect"

export const PrivateKey = Schema.Uint8ArrayFromBase64.pipe(Schema.brand("PrivateKey"))
export type PrivateKey = typeof PrivateKey.Type
