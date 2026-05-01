import * as HashService from "@blockchain/core/crypto/HashService"
import { BlockHash } from "@blockchain/core/primitives/BlockHash"
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight"
import type { Difficulty } from "@blockchain/core/primitives/Difficulty"
import { Nonce } from "@blockchain/core/primitives/Nonce"
import type { Timestamp } from "@blockchain/core/primitives/Timestamp"
import { Transaction } from "@blockchain/core/Transaction/Transaction"
import { DateTime, Duration, Effect, Option } from "effect"
import { Block } from "../domain/Block.js"

export const computeHash = Effect.fn("computeBlockHash")(function* ({
  height,
  previousHash,
  timestamp,
  transactions,
  difficulty,
  nonce
}: {
  height: BlockHeight
  previousHash: Option.Option<BlockHash>
  timestamp: Timestamp
  transactions: ReadonlyArray<Transaction>
  difficulty: Difficulty
  nonce: Nonce
}) {
  const blockData = JSON.stringify({
    height,
    previousHash: Option.getOrElse(previousHash, () => BlockHash.make("0")),
    timestamp,
    transactions,
    difficulty,
    nonce
  })

  const hash = yield* HashService.sha256String(blockData)

  return BlockHash.make(hash)
})

export const mine = Effect.fn("mineBlock")(function* ({
  height,
  previousHash,
  timestamp,
  transactions,
  difficulty
}: {
  height: BlockHeight
  previousHash: Option.Option<BlockHash>
  timestamp: Timestamp
  transactions: ReadonlyArray<Transaction>
  difficulty: Difficulty
}) {
  let nonce = Nonce.make(0)

  while (true) {
    const hash = yield* computeHash({
      height,
      previousHash,
      timestamp,
      transactions,
      difficulty,
      nonce
    })

    if (HashService.hashMatchesDifficulty(hash, difficulty)) {
      return new Block({
        hash,
        height,
        header: {
          previousHash,
          timestamp,
          difficulty,
          nonce
        },
        transactions
      })
    }

    nonce++
  }
})

const isValidTimestamp = (previousBlockTimestamp: Timestamp, nextBlockTimestamp: Timestamp) =>
  Effect.gen(function* () {
    const elapsed = DateTime.distance(previousBlockTimestamp, nextBlockTimestamp)

    if (elapsed < Duration.minutes(1)) {
      return false
    }

    const now = yield* DateTime.now
    if (DateTime.distance(now, nextBlockTimestamp) < Duration.minutes(1)) {
      return false
    }

    return true
  })

export const isNextValid = Effect.fn("isNextBlockValid")(function* (
  previousBlock: Block,
  nextBlock: Block
) {
  if (previousBlock.height + 1 !== nextBlock.height) {
    return false
  }

  if (
    Option.isNone(nextBlock.header.previousHash) ||
    previousBlock.hash !== nextBlock.header.previousHash.value
  ) {
    return false
  }

  const nextBlockExpectedHash = yield* computeHash({
    height: BlockHeight.make(nextBlock.height),
    previousHash: Option.some(previousBlock.hash),
    timestamp: nextBlock.header.timestamp,
    transactions: nextBlock.transactions,
    difficulty: previousBlock.header.difficulty,
    nonce: nextBlock.header.nonce
  })

  if (nextBlockExpectedHash !== nextBlock.hash) {
    return false
  }

  return yield* isValidTimestamp(previousBlock.header.timestamp, nextBlock.header.timestamp)
})
