import { BlockHash } from "@blockchain/core/primitives/BlockHash"
import { Difficulty } from "@blockchain/core/primitives/Difficulty"
import { Nonce } from "@blockchain/core/primitives/Nonce"
import { Timestamp } from "@blockchain/core/primitives/Timestamp"
import { Schema } from "effect"

export const BlockHeader = Schema.Struct({
  previousHash: Schema.Option(BlockHash),
  timestamp: Timestamp,
  difficulty: Difficulty,
  nonce: Nonce
})
export type BlockHeader = typeof BlockHeader.Type
