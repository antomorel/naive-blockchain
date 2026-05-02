import { BlockHash } from "@blockchain/core/primitives/BlockHash";
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight";
import { Difficulty } from "@blockchain/core/primitives/Difficulty";
import { Nonce } from "@blockchain/core/primitives/Nonce";
import { make as makeTimestamp } from "@blockchain/core/primitives/Timestamp";
import { describe, it } from "@effect/vitest";
import { Duration, Effect, Option, Record } from "effect";
import { expect } from "vitest";
import { Block, GenesisBlock } from "../domain/Block.js";
import { Blockchain } from "../domain/Blockchain.js";
import * as BlockchainService from "./BlockchainService.js";

const GENESIS_TIMESTAMP_MS = 1777637924000;

const createTestBlockchain = () =>
  new Blockchain({
    blocks: Record.singleton(GenesisBlock.hash, GenesisBlock),
    latestBlockHash: GenesisBlock.hash,
    height: BlockHeight.make(0),
    genesisBlockHash: GenesisBlock.hash,
    mempool: []
  });

const createBlockAtHeight = (
  height: number,
  previousHash: BlockHash,
  difficulty: Difficulty,
  timestampMs: number
) =>
  new Block({
    hash: BlockHash.make(`hash-${height}-${"0".repeat(56)}`),
    height: BlockHeight.make(height),
    header: {
      previousHash: Option.some(previousHash),
      timestamp: makeTimestamp(timestampMs),
      difficulty,
      nonce: Nonce.make(0)
    },
    transactions: []
  });

describe("BlockchainService", () => {
  describe("getDifficulty", () => {
    it.effect("should return genesis block difficulty for new blockchain", () =>
      Effect.gen(function* () {
        const blockchain = createTestBlockchain();

        const difficulty = yield* BlockchainService.getDifficulty(blockchain);

        expect(difficulty).toBe(GenesisBlock.header.difficulty);
      })
    );

    it.effect("should return latest block difficulty when not at adjustment interval", () =>
      Effect.gen(function* () {
        const block1 = createBlockAtHeight(
          1,
          GenesisBlock.hash,
          Difficulty.make(2),
          GENESIS_TIMESTAMP_MS + Duration.toMillis(Duration.minutes(2))
        );

        const blockchain = new Blockchain({
          blocks: Record.fromEntries([
            [GenesisBlock.hash, GenesisBlock],
            [block1.hash, block1]
          ]),
          latestBlockHash: block1.hash,
          height: BlockHeight.make(1),
          genesisBlockHash: GenesisBlock.hash,
          mempool: []
        });

        const difficulty = yield* BlockchainService.getDifficulty(blockchain);

        expect(difficulty).toBe(2);
      })
    );
  });

  describe("getCumulativeDifficulty", () => {
    it.effect("should return 0 for blockchain with only genesis block", () =>
      Effect.gen(function* () {
        const blockchain = createTestBlockchain();

        const cumulative = yield* BlockchainService.getCumulativeDifficulty(blockchain);

        expect(cumulative).toBe(2);
      })
    );

    it.effect("should calculate cumulative difficulty for chain with blocks", () =>
      Effect.gen(function* () {
        const block1 = createBlockAtHeight(
          1,
          GenesisBlock.hash,
          Difficulty.make(1),
          GENESIS_TIMESTAMP_MS + Duration.toMillis(Duration.minutes(2))
        );

        const blockchain = new Blockchain({
          blocks: Record.fromEntries([
            [GenesisBlock.hash, GenesisBlock],
            [block1.hash, block1]
          ]),
          latestBlockHash: block1.hash,
          height: BlockHeight.make(1),
          genesisBlockHash: GenesisBlock.hash,
          mempool: []
        });

        const cumulative = yield* BlockchainService.getCumulativeDifficulty(blockchain);

        expect(cumulative).toBe(4);
      })
    );

    it.effect("should sum difficulties across multiple blocks", () =>
      Effect.gen(function* () {
        const block1 = createBlockAtHeight(
          1,
          GenesisBlock.hash,
          Difficulty.make(1),
          GENESIS_TIMESTAMP_MS + Duration.toMillis(Duration.minutes(2))
        );

        const block2 = createBlockAtHeight(
          2,
          block1.hash,
          Difficulty.make(2),
          GENESIS_TIMESTAMP_MS + Duration.toMillis(Duration.minutes(4))
        );

        const blockchain = new Blockchain({
          blocks: Record.fromEntries([
            [GenesisBlock.hash, GenesisBlock],
            [block1.hash, block1],
            [block2.hash, block2]
          ]),
          latestBlockHash: block2.hash,
          height: BlockHeight.make(2),
          genesisBlockHash: GenesisBlock.hash,
          mempool: []
        });

        const cumulative = yield* BlockchainService.getCumulativeDifficulty(blockchain);

        expect(cumulative).toBe(8);
      })
    );
  });
});
