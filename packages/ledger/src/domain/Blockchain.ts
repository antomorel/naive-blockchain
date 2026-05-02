import { BlockHash } from "@blockchain/core/primitives/BlockHash";
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight";
import { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Effect, Option, Record, Schema } from "effect";
import * as BlockchainService from "../infrastructure/BlockchainService.js";
import * as BlockService from "../infrastructure/BlockService.js";
import { Block, GenesisBlock } from "./Block.js";

export class Blockchain extends Schema.Class<Blockchain>("Blockchain")({
  blocks: Schema.Record(BlockHash, Block),
  latestBlockHash: BlockHash,
  height: BlockHeight,
  genesisBlockHash: BlockHash,
  mempool: Schema.Array(Transaction)
}) {
  static getLatestBlock = (self: Blockchain) =>
    Record.get(self.blocks, self.latestBlockHash).pipe(
      Option.match({ onSome: Effect.succeed, onNone: () => Effect.die("No previous block found") })
    );

  static isValid = (self: Blockchain) =>
    Effect.gen(function* () {
      const lastBlockOption = Record.get(self.blocks, self.latestBlockHash);

      if (Option.isNone(lastBlockOption)) {
        return false;
      }

      let lastBlock = lastBlockOption.value;

      while (Option.isSome(lastBlock.header.previousHash)) {
        const previousBlock = Record.get(self.blocks, lastBlock.header.previousHash.value);

        if (Option.isNone(previousBlock)) {
          return false;
        }

        const areBlocksValid = yield* BlockService.isNextValid(previousBlock.value, lastBlock);

        if (!areBlocksValid) {
          return false;
        }

        lastBlock = previousBlock.value;
      }

      return JSON.stringify(lastBlock) === JSON.stringify(GenesisBlock);
    });

  static shouldBeReplaced = (self: Blockchain, that: Blockchain) =>
    Effect.gen(function* () {
      const selfIsValid = yield* Blockchain.isValid(self);
      const thatIsValid = yield* Blockchain.isValid(that);

      if (!thatIsValid) {
        return false;
      }

      if (!selfIsValid) {
        return true;
      }

      const selfDifficulty = yield* BlockchainService.getCumulativeDifficulty(self);
      const thatDifficulty = yield* BlockchainService.getCumulativeDifficulty(that);

      if (selfDifficulty !== thatDifficulty) {
        return selfDifficulty < thatDifficulty;
      }

      return self.height < that.height;
    });
}
