import * as HashService from "@blockchain/core/crypto/HashService";
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight";
import { Nonce } from "@blockchain/core/primitives/Nonce";
import type { Transaction } from "@blockchain/core/Transaction/Transaction";
import { DateTime, Duration, Effect, Layer, Option } from "effect";
import { Block } from "../domain/Block.js";
import { MinerService } from "../domain/Miner.js";
import * as BlockService from "./BlockService.js";

export const mineNext = Effect.fn("mineBlock")(function* (
  previousBlock: Block,
  transactions: ReadonlyArray<Transaction>
) {
  const height = BlockHeight.make(previousBlock.height + 1);
  const timestamp = yield* DateTime.now;
  const difficulty = previousBlock.header.difficulty;
  const previousHash = Option.some(previousBlock.hash);

  let nonce = Nonce.make(0);

  let hash = yield* BlockService.computeHash({
    height,
    previousHash,
    timestamp,
    transactions,
    difficulty: previousBlock.header.difficulty,
    nonce
  });

  yield* Effect.whileLoop({
    while: () => !HashService.hashMatchesDifficulty(hash, difficulty),
    body: Effect.fnUntraced(function* () {
      nonce++;
      hash = yield* BlockService.computeHash({
        height,
        previousHash,
        timestamp,
        transactions,
        difficulty: previousBlock.header.difficulty,
        nonce
      });

      yield* Effect.sleep(Duration.millis(50));
    }),
    step: () => {}
  });

  return new Block({
    hash,
    height,
    header: { previousHash, timestamp, difficulty, nonce },
    transactions
  });
});

export const TestMinerService = Layer.succeed(MinerService, MinerService.of({ mineNext }));
