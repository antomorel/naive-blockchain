import { BlockHash } from "@blockchain/core/primitives/BlockHash"
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight"
import type { Transaction } from "@blockchain/core/Transaction/Transaction"
import { Effect, Option, Record, Schema } from "effect"
import * as BlockchainService from "../infrastructure/BlockchainService.js"
import * as BlockService from "../infrastructure/BlockService.js"
import { Block, GenesisBlock } from "./Block.js"

export class Blockchain extends Schema.Class<Blockchain>("Blockchain")({
  blocks: Schema.Record(BlockHash, Block),
  latestBlockHash: BlockHash,
  height: BlockHeight,
  genesisBlockHash: BlockHash
}) {
  static generateNextBlock =
    (blockchain: Blockchain) => (transactions: ReadonlyArray<Transaction>) =>
      Effect.gen(function* () {
        const previousBlock = Record.get(blockchain.blocks, blockchain.latestBlockHash)

        if (Option.isNone(previousBlock)) {
          return yield* Effect.die("No previous block found")
        }

        return yield* Block.makeNext(previousBlock.value, transactions)
      })

  static isValid = (blockchain: Blockchain) =>
    Effect.gen(function* () {
      const lastBlockOption = Record.get(blockchain.blocks, blockchain.latestBlockHash)

      if (Option.isNone(lastBlockOption)) {
        return false
      }

      let lastBlock = lastBlockOption.value

      while (Option.isSome(lastBlock.header.previousHash)) {
        const previousBlock = Record.get(blockchain.blocks, lastBlock.header.previousHash.value)

        if (Option.isNone(previousBlock)) {
          return false
        }

        const areBlocksValid = yield* BlockService.isNextValid(previousBlock.value, lastBlock)

        if (!areBlocksValid) {
          return false
        }

        lastBlock = previousBlock.value
      }

      if (lastBlock.height !== 0) {
        return false
      }

      return JSON.stringify(lastBlock) === JSON.stringify(GenesisBlock)
    })

  static shouldBeReplaced = (self: Blockchain) => (that: Blockchain) =>
    Effect.gen(function* () {
      const selfIsValid = yield* Blockchain.isValid(self)
      const thatIsValid = yield* Blockchain.isValid(that)

      if (!thatIsValid) {
        return false
      }

      if (!selfIsValid) {
        return true
      }

      const selfDifficulty = yield* BlockchainService.getCumulativeDifficulty(self)

      const thatDifficulty = yield* BlockchainService.getCumulativeDifficulty(that)

      if (selfDifficulty !== thatDifficulty) {
        return selfDifficulty < thatDifficulty
      }

      return self.height < that.height
    })
}
