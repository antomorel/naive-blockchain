import { BlockHash } from "@blockchain/core/primitives/BlockHash";
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight";
import { Difficulty } from "@blockchain/core/primitives/Difficulty";
import { Nonce } from "@blockchain/core/primitives/Nonce";
import { make as makeTimestamp } from "@blockchain/core/primitives/Timestamp";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import * as BlockService from "../infrastructure/BlockService.js";
import { Block, GenesisBlock } from "./Block.js";

describe("Block", () => {
  describe("GenesisBlock", () => {
    it("should have height 0", () => {
      expect(GenesisBlock.height).toBe(0);
    });

    it("should have no previous hash", () => {
      expect(Option.isNone(GenesisBlock.header.previousHash)).toBe(true);
    });

    it("should have difficulty 1", () => {
      expect(GenesisBlock.header.difficulty).toBe(1);
    });

    it("should have empty transactions", () => {
      expect(GenesisBlock.transactions).toEqual([]);
    });

    it("should have a valid hash format", () => {
      expect(GenesisBlock.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should be an instance of Block", () => {
      expect(GenesisBlock).toBeInstanceOf(Block);
    });

    it.effect("should be a valid block", () =>
      Effect.gen(function* () {
        const expectedHash = yield* BlockService.computeHash({
          height: GenesisBlock.height,
          previousHash: Option.none(),
          timestamp: GenesisBlock.header.timestamp,
          transactions: [],
          difficulty: Difficulty.make(1),
          nonce: Nonce.make(0)
        });

        expect(GenesisBlock.hash).toBe(expectedHash);
      })
    );
  });

  describe("Block schema", () => {
    it("should accept valid block structure", () => {
      const block = new Block({
        hash: BlockHash.make("0000000000000000000000000000000000000000000000000000000000000000"),
        height: BlockHeight.make(1),
        header: {
          previousHash: Option.some(GenesisBlock.hash),
          timestamp: makeTimestamp(Date.now()),
          difficulty: Difficulty.make(1),
          nonce: Nonce.make(42)
        },
        transactions: []
      });

      expect(block.height).toBe(1);
      expect(Option.isSome(block.header.previousHash)).toBe(true);
    });

    it("should preserve all fields", () => {
      const hash = BlockHash.make(
        "abc123def456abc123def456abc123def456abc123def456abc123def456abc1"
      );
      const height = BlockHeight.make(5);
      const previousHash = Option.some(BlockHash.make("prev"));
      const timestamp = makeTimestamp(1234567890000);
      const difficulty = Difficulty.make(3);
      const nonce = Nonce.make(999);

      const block = new Block({
        hash,
        height,
        header: {
          previousHash,
          timestamp,
          difficulty,
          nonce
        },
        transactions: []
      });

      expect(block.hash).toBe(hash);
      expect(block.height).toBe(5);
      expect(block.header.previousHash).toEqual(previousHash);
      expect(block.header.difficulty).toBe(3);
      expect(block.header.nonce).toBe(999);
    });
  });
});
