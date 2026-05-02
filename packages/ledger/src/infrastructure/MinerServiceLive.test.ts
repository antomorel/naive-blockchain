import { describe } from "@effect/vitest";
import { Effect, Option } from "effect";
import { expect } from "vitest";
import { GenesisBlock } from "../domain/Block.js";
import { mineNext } from "./MinerServiceLive.js";

describe("MinerServiceLive", () => {
  describe("mine", (it) => {
    it("should create block with incremented height", () =>
      Effect.gen(function* () {
        const nextBlock = yield* mineNext(GenesisBlock, []);

        expect(nextBlock.height).toBe(1);
      }));

    it("should reference previous block hash", () =>
      Effect.gen(function* () {
        const nextBlock = yield* mineNext(GenesisBlock, []);

        expect(Option.isSome(nextBlock.header.previousHash)).toBe(true);
        if (Option.isSome(nextBlock.header.previousHash)) {
          expect(nextBlock.header.previousHash.value).toBe(GenesisBlock.hash);
        }
      }));

    it("should inherit difficulty from previous block", () =>
      Effect.gen(function* () {
        const nextBlock = yield* mineNext(GenesisBlock, []);

        expect(nextBlock.header.difficulty).toBe(GenesisBlock.header.difficulty);
      }));

    it("should produce a mined block with valid hash", () =>
      Effect.gen(function* () {
        const nextBlock = yield* mineNext(GenesisBlock, []);

        // The hash should meet the difficulty requirement (1 leading zero byte)
        expect(nextBlock.hash).toMatch(/^00/);
      }));

    it("should chain multiple blocks correctly", () =>
      Effect.gen(function* () {
        const block1 = yield* mineNext(GenesisBlock, []);
        const block2 = yield* mineNext(block1, []);
        const block3 = yield* mineNext(block2, []);

        expect(block1.height).toBe(1);
        expect(block2.height).toBe(2);
        expect(block3.height).toBe(3);

        if (Option.isSome(block2.header.previousHash)) {
          expect(block2.header.previousHash.value).toBe(block1.hash);
        }
        if (Option.isSome(block3.header.previousHash)) {
          expect(block3.header.previousHash.value).toBe(block2.hash);
        }
      }));
  });
});
