import { BlockHash } from "@blockchain/core/primitives/BlockHash";
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight";
import { Difficulty } from "@blockchain/core/primitives/Difficulty";
import { Nonce } from "@blockchain/core/primitives/Nonce";
import { make as makeTimestamp } from "@blockchain/core/primitives/Timestamp";
import { describe } from "@effect/vitest";
import { Effect, Option } from "effect";
import { TestClock } from "effect/testing";
import { expect } from "vitest";
import { Block, GenesisBlock } from "../domain/Block.js";
import * as BlockService from "./BlockService.js";

const TEST_TIMESTAMP = makeTimestamp(1777637924);

const GENESIS_TIMESTAMP_MS = 1777637924;
const NEXT_BLOCK_TIMESTAMP_MS = GENESIS_TIMESTAMP_MS + 2 * 60 * 1000; // 2 minutes later
const NEXT_BLOCK_TIMESTAMP = makeTimestamp(NEXT_BLOCK_TIMESTAMP_MS);

const BLOCK_2_TIMESTAMP_MS = NEXT_BLOCK_TIMESTAMP_MS + 2 * 60 * 1000;
const BLOCK_2_TIMESTAMP = makeTimestamp(BLOCK_2_TIMESTAMP_MS);

describe("BlockService", () => {
  describe("computeHash", (it) => {
    it("should compute deterministic hash for same inputs", () =>
      Effect.gen(function* () {
        const params = {
          height: BlockHeight.make(1),
          previousHash: Option.some(BlockHash.make("abc123")),
          timestamp: TEST_TIMESTAMP,
          transactions: [],
          difficulty: Difficulty.make(1),
          nonce: Nonce.make(0)
        };

        const hash1 = yield* BlockService.computeHash(params);
        const hash2 = yield* BlockService.computeHash(params);

        expect(hash1).toBe(hash2);
      }));

    it("should produce different hashes for different heights", () =>
      Effect.gen(function* () {
        const baseParams = {
          previousHash: Option.some(BlockHash.make("abc123")),
          timestamp: TEST_TIMESTAMP,
          transactions: [],
          difficulty: Difficulty.make(1),
          nonce: Nonce.make(0)
        };

        const hash1 = yield* BlockService.computeHash({
          ...baseParams,
          height: BlockHeight.make(1)
        });

        const hash2 = yield* BlockService.computeHash({
          ...baseParams,
          height: BlockHeight.make(2)
        });

        expect(hash1).not.toBe(hash2);
      }));

    it("should produce different hashes for different nonces", () =>
      Effect.gen(function* () {
        const baseParams = {
          height: BlockHeight.make(1),
          previousHash: Option.some(BlockHash.make("abc123")),
          timestamp: TEST_TIMESTAMP,
          transactions: [],
          difficulty: Difficulty.make(1)
        };

        const hash1 = yield* BlockService.computeHash({
          ...baseParams,
          nonce: Nonce.make(0)
        });

        const hash2 = yield* BlockService.computeHash({
          ...baseParams,
          nonce: Nonce.make(1)
        });

        expect(hash1).not.toBe(hash2);
      }));

    it("should produce different hashes for different previousHash values", () =>
      Effect.gen(function* () {
        const baseParams = {
          height: BlockHeight.make(1),
          timestamp: TEST_TIMESTAMP,
          transactions: [],
          difficulty: Difficulty.make(1),
          nonce: Nonce.make(0)
        };

        const hashWithPrevious = yield* BlockService.computeHash({
          ...baseParams,
          previousHash: Option.some(BlockHash.make("abc123"))
        });

        const hashWithoutPrevious = yield* BlockService.computeHash({
          ...baseParams,
          previousHash: Option.none()
        });

        expect(hashWithPrevious).not.toBe(hashWithoutPrevious);
      }));

    it("should return a valid hex string hash", () =>
      Effect.gen(function* () {
        const hash = yield* BlockService.computeHash({
          height: BlockHeight.make(1),
          previousHash: Option.none(),
          timestamp: TEST_TIMESTAMP,
          transactions: [],
          difficulty: Difficulty.make(1),
          nonce: Nonce.make(0)
        });

        // SHA-256 produces 64 hex characters
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      }));
  });

  describe("mine", (it) => {
    it("should produce a valid block with correct structure", () =>
      Effect.gen(function* () {
        const block = yield* BlockService.mine({
          height: BlockHeight.make(1),
          previousHash: Option.some(GenesisBlock.hash),
          timestamp: TEST_TIMESTAMP,
          transactions: [],
          difficulty: Difficulty.make(1)
        });

        expect(block).toBeInstanceOf(Block);
        expect(block.height).toBe(1);
        expect(block.transactions).toEqual([]);
        expect(Option.isSome(block.header.previousHash)).toBe(true);
        if (Option.isSome(block.header.previousHash)) {
          expect(block.header.previousHash.value).toBe(GenesisBlock.hash);
        }
      }));

    it("should produce hash that satisfies difficulty requirement", () =>
      Effect.gen(function* () {
        const difficulty = Difficulty.make(1);

        const block = yield* BlockService.mine({
          height: BlockHeight.make(1),
          previousHash: Option.some(GenesisBlock.hash),
          timestamp: TEST_TIMESTAMP,
          transactions: [],
          difficulty
        });

        // Convert hash to bytes and check first byte is 0
        const hashBytes = hexToBytes(block.hash);
        expect(hashBytes[0]).toBe(0);
      }));

    it("should preserve input data in mined block", () =>
      Effect.gen(function* () {
        const height = BlockHeight.make(5);
        const previousHash = Option.some(BlockHash.make("test-hash-123"));
        const difficulty = Difficulty.make(1);

        const block = yield* BlockService.mine({
          height,
          previousHash,
          timestamp: TEST_TIMESTAMP,
          transactions: [],
          difficulty
        });

        expect(block.height).toBe(5);
        expect(block.header.previousHash).toEqual(previousHash);
        expect(block.header.timestamp).toEqual(TEST_TIMESTAMP);
        expect(block.header.difficulty).toBe(difficulty);
      }));

    it("should mine genesis-like block without previousHash", () =>
      Effect.gen(function* () {
        const block = yield* BlockService.mine({
          height: BlockHeight.make(0),
          previousHash: Option.none(),
          timestamp: TEST_TIMESTAMP,
          transactions: [],
          difficulty: Difficulty.make(1)
        });

        expect(block.height).toBe(0);
        expect(Option.isNone(block.header.previousHash)).toBe(true);
      }));
  });

  describe("isNextValid", (it) => {
    it("should return true for valid consecutive blocks", () =>
      Effect.gen(function* () {
        const nextBlock = yield* BlockService.mine({
          height: BlockHeight.make(1),
          previousHash: Option.some(GenesisBlock.hash),
          timestamp: NEXT_BLOCK_TIMESTAMP,
          transactions: [],
          difficulty: GenesisBlock.header.difficulty
        });

        // Set clock to a time after the block's timestamp
        yield* TestClock.setTime(NEXT_BLOCK_TIMESTAMP_MS + 2 * 60 * 1000);

        const isValid = yield* BlockService.isNextValid(GenesisBlock, nextBlock);

        expect(isValid).toBe(true);
      }));

    it("should return false when height is not consecutive", () =>
      Effect.gen(function* () {
        const invalidBlock = new Block({
          hash: BlockHash.make("0000000000000000000000000000000000000000000000000000000000000000"),
          height: BlockHeight.make(5), // Should be 1
          header: {
            previousHash: Option.some(GenesisBlock.hash),
            timestamp: NEXT_BLOCK_TIMESTAMP,
            difficulty: GenesisBlock.header.difficulty,
            nonce: Nonce.make(0)
          },
          transactions: []
        });

        const isValid = yield* BlockService.isNextValid(GenesisBlock, invalidBlock);

        expect(isValid).toBe(false);
      }));

    it("should return false when previousHash is None", () =>
      Effect.gen(function* () {
        const invalidBlock = new Block({
          hash: BlockHash.make("0000000000000000000000000000000000000000000000000000000000000000"),
          height: BlockHeight.make(1),
          header: {
            previousHash: Option.none(), // Should reference genesis
            timestamp: NEXT_BLOCK_TIMESTAMP,
            difficulty: GenesisBlock.header.difficulty,
            nonce: Nonce.make(0)
          },
          transactions: []
        });

        const isValid = yield* BlockService.isNextValid(GenesisBlock, invalidBlock);

        expect(isValid).toBe(false);
      }));

    it("should return false when previousHash does not match", () =>
      Effect.gen(function* () {
        const invalidBlock = new Block({
          hash: BlockHash.make("0000000000000000000000000000000000000000000000000000000000000000"),
          height: BlockHeight.make(1),
          header: {
            previousHash: Option.some(BlockHash.make("wrong-hash")),
            timestamp: NEXT_BLOCK_TIMESTAMP,
            difficulty: GenesisBlock.header.difficulty,
            nonce: Nonce.make(0)
          },
          transactions: []
        });

        const isValid = yield* BlockService.isNextValid(GenesisBlock, invalidBlock);

        expect(isValid).toBe(false);
      }));

    it("should return false when hash has been tampered with", () =>
      Effect.gen(function* () {
        const validBlock = yield* BlockService.mine({
          height: BlockHeight.make(1),
          previousHash: Option.some(GenesisBlock.hash),
          timestamp: NEXT_BLOCK_TIMESTAMP,
          transactions: [],
          difficulty: GenesisBlock.header.difficulty
        });

        const tamperedBlock = new Block({
          ...validBlock,
          hash: BlockHash.make("tampered-hash-that-does-not-match")
        });

        yield* TestClock.setTime(NEXT_BLOCK_TIMESTAMP_MS + 2 * 60 * 1000);

        const isValid = yield* BlockService.isNextValid(GenesisBlock, tamperedBlock);

        expect(isValid).toBe(false);
      }));

    it("should validate chain of multiple blocks", () =>
      Effect.gen(function* () {
        const block1 = yield* BlockService.mine({
          height: BlockHeight.make(1),
          previousHash: Option.some(GenesisBlock.hash),
          timestamp: NEXT_BLOCK_TIMESTAMP,
          transactions: [],
          difficulty: GenesisBlock.header.difficulty
        });

        const block2 = yield* BlockService.mine({
          height: BlockHeight.make(2),
          previousHash: Option.some(block1.hash),
          timestamp: BLOCK_2_TIMESTAMP,
          transactions: [],
          difficulty: block1.header.difficulty
        });

        // Set clock to 2 minutes after block 2's timestamp
        yield* TestClock.setTime(BLOCK_2_TIMESTAMP_MS + 2 * 60 * 1000);

        const isBlock1Valid = yield* BlockService.isNextValid(GenesisBlock, block1);
        const isBlock2Valid = yield* BlockService.isNextValid(block1, block2);

        expect(isBlock1Valid).toBe(true);
        expect(isBlock2Valid).toBe(true);
      }));

    it("should return false when timestamp difference is less than 1 minute", () =>
      Effect.gen(function* () {
        const tooSoonTimestamp = makeTimestamp(GENESIS_TIMESTAMP_MS + 30 * 1000);

        const block = yield* BlockService.mine({
          height: BlockHeight.make(1),
          previousHash: Option.some(GenesisBlock.hash),
          timestamp: tooSoonTimestamp,
          transactions: [],
          difficulty: GenesisBlock.header.difficulty
        });

        yield* TestClock.setTime(GENESIS_TIMESTAMP_MS + 5 * 60 * 1000);

        const isValid = yield* BlockService.isNextValid(GenesisBlock, block);

        expect(isValid).toBe(false);
      }));
  });
});

// Helper function to convert hex string to bytes
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
