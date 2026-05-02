import { DateTime, Duration, Effect, Option, Record } from "effect";
import type { Block } from "../domain/Block.js";
import type { Blockchain } from "../domain/Blockchain.js";
import { BLOCK_GENERATION_INTERVAL, DIFFICULTY_ADJUSTMENT_INTERVAL } from "../domain/constants.js";

export const getDifficulty = (blockchain: Blockchain) =>
  Effect.gen(function* () {
    const latestBlock = Record.get(blockchain.blocks, blockchain.latestBlockHash);

    if (Option.isNone(latestBlock)) {
      return yield* Effect.die("No latest block found");
    }

    if (
      latestBlock.value.height % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 &&
      latestBlock.value.height !== 0
    ) {
      return yield* getAdjustedDifficulty(latestBlock.value, blockchain);
    }

    return latestBlock.value.header.difficulty;
  });

const getAdjustedDifficulty = (latestBlock: Block, blockchain: Blockchain) =>
  Effect.gen(function* () {
    const prevAdjustmentBlock = Record.get(blockchain.blocks, blockchain.latestBlockHash);

    if (Option.isNone(prevAdjustmentBlock)) {
      return yield* Effect.die("No previous adjustment block found");
    }

    const timeExpected = Duration.times(BLOCK_GENERATION_INTERVAL, DIFFICULTY_ADJUSTMENT_INTERVAL);

    const timeTaken = DateTime.distance(
      latestBlock.header.timestamp,
      prevAdjustmentBlock.value.header.timestamp
    );

    if (Duration.isLessThan(timeTaken, Duration.divideUnsafe(timeExpected, 2))) {
      return prevAdjustmentBlock.value.header.difficulty + 1;
    }

    if (Duration.isGreaterThan(timeTaken, Duration.times(timeExpected, 2))) {
      return prevAdjustmentBlock.value.header.difficulty - 1;
    }

    return prevAdjustmentBlock.value.header.difficulty;
  });

export const getCumulativeDifficulty = (blockchain: Blockchain) =>
  Effect.gen(function* () {
    const lastBlockOption = Record.get(blockchain.blocks, blockchain.latestBlockHash);

    if (Option.isNone(lastBlockOption)) {
      return yield* Effect.die("No last block found");
    }

    let difficulty = 0;
    let lastBlock = lastBlockOption.value;

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
