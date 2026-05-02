import { DateTime, Duration, Effect, Option, Record } from "effect";
import type { Block } from "../domain/Block.js";
import { Blockchain } from "../domain/Blockchain.js";
import { BLOCK_GENERATION_INTERVAL, DIFFICULTY_ADJUSTMENT_INTERVAL } from "../domain/constants.js";

export const getDifficulty = (blockchain: Blockchain) =>
  Effect.gen(function* () {
    const latestBlock = yield* Blockchain.getLatestBlock(blockchain);

    if (latestBlock.height % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.height !== 0) {
      return yield* getAdjustedDifficulty(latestBlock, blockchain);
    }

    return latestBlock.header.difficulty;
  });

const getAdjustedDifficulty = (latestBlock: Block, blockchain: Blockchain) =>
  Effect.gen(function* () {
    const prevAdjustmentBlock = yield* Blockchain.getLatestBlock(blockchain);

    const timeExpected = Duration.times(BLOCK_GENERATION_INTERVAL, DIFFICULTY_ADJUSTMENT_INTERVAL);

    const timeTaken = DateTime.distance(
      latestBlock.header.timestamp,
      prevAdjustmentBlock.header.timestamp
    );

    if (Duration.isLessThan(timeTaken, Duration.divideUnsafe(timeExpected, 2))) {
      return prevAdjustmentBlock.header.difficulty + 1;
    }

    if (Duration.isGreaterThan(timeTaken, Duration.times(timeExpected, 2))) {
      return prevAdjustmentBlock.header.difficulty - 1;
    }

    return prevAdjustmentBlock.header.difficulty;
  });

export const getCumulativeDifficulty = (blockchain: Blockchain) =>
  Effect.gen(function* () {
    let lastBlock = yield* Blockchain.getLatestBlock(blockchain);

    let difficulty = 2 ** lastBlock.header.difficulty;

    while (Option.isSome(lastBlock.header.previousHash)) {
      const previousBlock = Record.get(blockchain.blocks, lastBlock.header.previousHash.value);

      if (Option.isNone(previousBlock)) {
        return yield* Effect.die("No previous block found");
      }

      lastBlock = previousBlock.value;
      difficulty += 2 ** lastBlock.header.difficulty;
    }

    return difficulty;
  });
