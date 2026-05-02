import { BlockHash } from "@blockchain/core/primitives/BlockHash";
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight";
import { Nonce } from "@blockchain/core/primitives/Nonce";
import { describe, it } from "@effect/vitest";
import { Effect, Record } from "effect";
import { TestClock } from "effect/testing";
import { expect } from "vitest";
import { mineNext } from "../infrastructure/MinerServiceLive.js";
import { Block, GenesisBlock } from "./Block.js";
import { Blockchain } from "./Blockchain.js";

const GENESIS_TIMESTAMP_MS = 1777637924000;
const BLOCK_1_TIMESTAMP_MS = GENESIS_TIMESTAMP_MS + 2 * 60 * 1000;
const BLOCK_2_TIMESTAMP_MS = BLOCK_1_TIMESTAMP_MS + 2 * 60 * 1000;
const VALIDATION_TIME_MS = BLOCK_2_TIMESTAMP_MS + 2 * 60 * 1000;

const createTestBlockchain = () =>
  new Blockchain({
    blocks: Record.singleton(GenesisBlock.hash, GenesisBlock),
    latestBlockHash: GenesisBlock.hash,
    height: BlockHeight.make(0),
    genesisBlockHash: GenesisBlock.hash,
    mempool: []
  });

const addBlockToChain = (blockchain: Blockchain, block: Block): Blockchain =>
  new Blockchain({
    blocks: Record.set(blockchain.blocks, block.hash, block),
    latestBlockHash: block.hash,
    height: block.height,
    genesisBlockHash: blockchain.genesisBlockHash,
    mempool: blockchain.mempool
  });

describe("Blockchain", () => {
  describe("isValid", () => {
    it.effect("should return true for blockchain with only genesis block", () =>
      Effect.gen(function* () {
        const blockchain = createTestBlockchain();

        yield* TestClock.setTime(VALIDATION_TIME_MS);
        const isValid = yield* Blockchain.isValid(blockchain);

        expect(isValid).toBe(true);
      })
    );

    it.effect("should return false when latest block hash not found", () =>
      Effect.gen(function* () {
        const blockchain = new Blockchain({
          blocks: Record.singleton(GenesisBlock.hash, GenesisBlock),
          latestBlockHash: BlockHash.make("nonexistent"),
          height: BlockHeight.make(1),
          genesisBlockHash: GenesisBlock.hash,
          mempool: []
        });

        const isValid = yield* Blockchain.isValid(blockchain);

        expect(isValid).toBe(false);
      })
    );

    it.effect("should return false for chain with tampered block hash", () =>
      Effect.gen(function* () {
        const blockchain = createTestBlockchain();

        yield* TestClock.setTime(BLOCK_1_TIMESTAMP_MS);
        const block1 = yield* mineNext(GenesisBlock, []);

        // Tamper with the block's hash
        const tamperedBlock = new Block({
          ...block1,
          hash: BlockHash.make("tampered-hash-value-that-is-not-valid-at-all-here")
        });

        const chain1 = addBlockToChain(blockchain, tamperedBlock);

        yield* TestClock.setTime(VALIDATION_TIME_MS);
        const isValid = yield* Blockchain.isValid(chain1);

        expect(isValid).toBe(false);
      })
    );

    it.effect("should return false when genesis block is modified", () =>
      Effect.gen(function* () {
        const modifiedGenesis = new Block({
          ...GenesisBlock,
          header: {
            ...GenesisBlock.header,
            nonce: Nonce.make(999) // Modified nonce
          }
        });

        const blockchain = new Blockchain({
          blocks: Record.singleton(modifiedGenesis.hash, modifiedGenesis),
          latestBlockHash: modifiedGenesis.hash,
          height: BlockHeight.make(0),
          genesisBlockHash: modifiedGenesis.hash,
          mempool: []
        });

        yield* TestClock.setTime(VALIDATION_TIME_MS);
        const isValid = yield* Blockchain.isValid(blockchain);

        expect(isValid).toBe(false);
      })
    );
  });

  describe("shouldBeReplaced", () => {
    it.effect("should return false when incoming chain is invalid", () =>
      Effect.gen(function* () {
        const validChain = createTestBlockchain();

        const invalidChain = new Blockchain({
          blocks: Record.singleton(GenesisBlock.hash, GenesisBlock),
          latestBlockHash: BlockHash.make("nonexistent"),
          height: BlockHeight.make(0),
          genesisBlockHash: GenesisBlock.hash,
          mempool: []
        });

        yield* TestClock.setTime(VALIDATION_TIME_MS);
        const shouldReplace = yield* Blockchain.shouldBeReplaced(validChain, invalidChain);

        expect(shouldReplace).toBe(false);
      })
    );

    it.effect("should return true when current chain is invalid and incoming is valid", () =>
      Effect.gen(function* () {
        const invalidChain = new Blockchain({
          blocks: Record.singleton(GenesisBlock.hash, GenesisBlock),
          latestBlockHash: BlockHash.make("nonexistent"),
          height: BlockHeight.make(0),
          genesisBlockHash: GenesisBlock.hash,
          mempool: []
        });

        const validChain = createTestBlockchain();

        yield* TestClock.setTime(VALIDATION_TIME_MS);
        const shouldReplace = yield* Blockchain.shouldBeReplaced(invalidChain, validChain);

        expect(shouldReplace).toBe(true);
      })
    );

    it.effect("should return true when incoming chain has greater cumulative difficulty", () =>
      Effect.gen(function* () {
        const shortChain = createTestBlockchain();

        // Build a longer chain
        yield* TestClock.setTime(BLOCK_1_TIMESTAMP_MS);
        const block1 = yield* mineNext(GenesisBlock, []);
        const longerChain = addBlockToChain(shortChain, block1);

        yield* TestClock.setTime(VALIDATION_TIME_MS);

        const shouldReplace = yield* Blockchain.shouldBeReplaced(shortChain, longerChain);

        expect(shouldReplace).toBe(true);
      })
    );

    it.effect("should return false when both chains are equal", () =>
      Effect.gen(function* () {
        const chain = createTestBlockchain();

        yield* TestClock.setTime(VALIDATION_TIME_MS);
        const shouldReplace = yield* Blockchain.shouldBeReplaced(chain, chain);

        expect(shouldReplace).toBe(false);
      })
    );
  });
});
