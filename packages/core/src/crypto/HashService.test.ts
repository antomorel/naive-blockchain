import { describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { Difficulty } from "../primitives/Difficulty.js";
import * as HashService from "./HashService.js";

describe("HashService", () => {
  describe("sha256Hash", () => {
    it.effect("should produce deterministic hash for same input", () =>
      Effect.gen(function* () {
        const data = new Uint8Array([1, 2, 3, 4, 5]);

        const hash1 = yield* HashService.sha256Hash(data);
        const hash2 = yield* HashService.sha256Hash(data);

        expect(hash1).toBe(hash2);
      })
    );

    it.effect("should produce different hashes for different inputs", () =>
      Effect.gen(function* () {
        const data1 = new Uint8Array([1, 2, 3]);
        const data2 = new Uint8Array([4, 5, 6]);

        const hash1 = yield* HashService.sha256Hash(data1);
        const hash2 = yield* HashService.sha256Hash(data2);

        expect(hash1).not.toBe(hash2);
      })
    );

    it.effect("should return a 64-character hex string (SHA-256)", () =>
      Effect.gen(function* () {
        const data = new Uint8Array([1, 2, 3]);

        const hash = yield* HashService.sha256Hash(data);

        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      })
    );

    it.effect("should produce correct hash for empty input", () =>
      Effect.gen(function* () {
        const data = new Uint8Array([]);

        const hash = yield* HashService.sha256Hash(data);

        // SHA-256 of empty input is well-known
        expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
      })
    );
  });

  describe("sha256String", () => {
    it.effect("should produce deterministic hash for same string", () =>
      Effect.gen(function* () {
        const str = "hello world";

        const hash1 = yield* HashService.sha256String(str);
        const hash2 = yield* HashService.sha256String(str);

        expect(hash1).toBe(hash2);
      })
    );

    it.effect("should produce different hashes for different strings", () =>
      Effect.gen(function* () {
        const hash1 = yield* HashService.sha256String("hello");
        const hash2 = yield* HashService.sha256String("world");

        expect(hash1).not.toBe(hash2);
      })
    );

    it.effect("should return a 64-character hex string", () =>
      Effect.gen(function* () {
        const hash = yield* HashService.sha256String("test");

        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      })
    );

    it.effect("should produce correct hash for known input", () =>
      Effect.gen(function* () {
        const hash = yield* HashService.sha256String("hello");

        // SHA-256 of "hello" is well-known
        expect(hash).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
      })
    );
  });

  describe("hashMatchesDifficulty", () => {
    it("should return true when hash has enough leading zero bytes", () => {
      // Hash starting with "00" (1 zero byte)
      const hash = "00abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678";
      const difficulty = Difficulty.make(1);

      const result = HashService.hashMatchesDifficulty(hash, difficulty);

      expect(result).toBe(true);
    });

    it("should return false when hash does not have enough leading zero bytes", () => {
      // Hash starting with "ab" (no zero bytes)
      const hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const difficulty = Difficulty.make(1);

      const result = HashService.hashMatchesDifficulty(hash, difficulty);

      expect(result).toBe(false);
    });

    it("should return true for difficulty 1 with hash starting with zero byte", () => {
      const hash = "00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const difficulty = Difficulty.make(1);

      const result = HashService.hashMatchesDifficulty(hash, difficulty);

      expect(result).toBe(true);
    });

    it("should require multiple leading zero bytes for higher difficulty", () => {
      // Hash with 2 leading zero bytes
      const hashWith2Zeros = "0000abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456";
      const hashWith1Zero = "00abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678";

      const difficulty2 = Difficulty.make(2);

      expect(HashService.hashMatchesDifficulty(hashWith2Zeros, difficulty2)).toBe(true);
      expect(HashService.hashMatchesDifficulty(hashWith1Zero, difficulty2)).toBe(false);
    });

    it("should handle hash with all zeros", () => {
      const hash = "0000000000000000000000000000000000000000000000000000000000000000";
      const difficulty = Difficulty.make(5);

      const result = HashService.hashMatchesDifficulty(hash, difficulty);

      expect(result).toBe(true);
    });
  });
});
