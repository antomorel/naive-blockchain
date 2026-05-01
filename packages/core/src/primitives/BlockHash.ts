import { Schema } from "effect"

export const BlockHash = Schema.String.pipe(Schema.brand("BlockHash"))
export type BlockHash = typeof BlockHash.Type
