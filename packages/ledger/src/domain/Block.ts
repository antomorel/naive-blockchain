import { BlockHash } from "@blockchain/core/primitives/BlockHash"
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight"
import { Difficulty } from "@blockchain/core/primitives/Difficulty"
import { Nonce } from "@blockchain/core/primitives/Nonce"
import { Timestamp } from "@blockchain/core/primitives/Timestamp"
import { Transaction } from "@blockchain/core/Transaction/Transaction"
import { DateTime, Effect, Option, Schema } from "effect"
import * as BlockService from "../infrastructure/BlockService.js"
import { BlockHeader } from "./BlockHeader.js"

const MAY_1ST_2026_TIMESTAMP = 1777637924000

export class Block extends Schema.Class<Block>("Block")({
  hash: BlockHash,
  height: BlockHeight,
  header: BlockHeader,
  transactions: Schema.Array(Transaction)
}) {
  static makeNext = (previousBlock: Block, transactions: ReadonlyArray<Transaction>) =>
    Effect.gen(function* () {
      const nextIndex = previousBlock.height + 1

      const timestamp = yield* DateTime.now

      return yield* BlockService.mine({
        height: BlockHeight.make(nextIndex),
        previousHash: Option.some(previousBlock.hash),
        timestamp,
        transactions,
        difficulty: previousBlock.header.difficulty
      })
    })
}

export const GenesisBlock = new Block({
  hash: BlockHash.make("816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7"),
  height: BlockHeight.make(0),
  header: {
    previousHash: Option.none(),
    timestamp: Timestamp.make(
      Schema.decodeSync(Schema.DateTimeUtcFromMillis)(MAY_1ST_2026_TIMESTAMP)
    ),
    difficulty: Difficulty.make(1),
    nonce: Nonce.make(0)
  },
  transactions: []
})
