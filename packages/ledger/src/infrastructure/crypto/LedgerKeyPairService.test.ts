import { PublicKey } from "@blockchain/core/primitives/PublicKey";
import { describe, it } from "@effect/vitest";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { Effect } from "effect";
import { expect } from "vitest";
import * as LedgerKeyPairService from "./LedgerKeyPairService.js";

// Setup sha512 for ed25519
ed.hashes.sha512 = sha512;

describe("LedgerKeyPairService", () => {
  describe("deriveAddress", () => {
    it.effect("should derive deterministic address from public key", () =>
      Effect.gen(function* () {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = PublicKey.make(ed.getPublicKey(privateKey));

        const address1 = yield* LedgerKeyPairService.deriveAddress(publicKey);
        const address2 = yield* LedgerKeyPairService.deriveAddress(publicKey);

        expect(address1).toBe(address2);
      }));

    it.effect("should return address starting with 0x", () =>
      Effect.gen(function* () {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = PublicKey.make(ed.getPublicKey(privateKey));

        const address = yield* LedgerKeyPairService.deriveAddress(publicKey);

        expect(address.startsWith("0x")).toBe(true);
      }));

    it.effect("should return 42-character address (0x + 40 hex chars)", () =>
      Effect.gen(function* () {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = PublicKey.make(ed.getPublicKey(privateKey));

        const address = yield* LedgerKeyPairService.deriveAddress(publicKey);

        // 0x prefix + 20 bytes = 42 characters
        expect(address).toHaveLength(42);
        expect(address).toMatch(/^0x[a-f0-9]{40}$/);
      }));

    it.effect("should produce different addresses for different public keys", () =>
      Effect.gen(function* () {
        const privateKey1 = ed.utils.randomSecretKey();
        const publicKey1 = PublicKey.make(ed.getPublicKey(privateKey1));

        const privateKey2 = ed.utils.randomSecretKey();
        const publicKey2 = PublicKey.make(ed.getPublicKey(privateKey2));

        const address1 = yield* LedgerKeyPairService.deriveAddress(publicKey1);
        const address2 = yield* LedgerKeyPairService.deriveAddress(publicKey2);

        expect(address1).not.toBe(address2);
      }));

    it.effect("should derive address from known public key bytes", () =>
      Effect.gen(function* () {
        // Use a fixed public key for deterministic testing
        const fixedPublicKeyBytes = new Uint8Array(32).fill(1);
        const publicKey = PublicKey.make(fixedPublicKeyBytes);

        const address = yield* LedgerKeyPairService.deriveAddress(publicKey);

        // Address should be consistent
        expect(address.startsWith("0x")).toBe(true);
        expect(address).toHaveLength(42);
      }));
  });
});
