import { PublicKey } from "@blockchain/core/primitives/PublicKey";
import { Signature } from "@blockchain/core/primitives/Signature";
import { describe, it } from "@effect/vitest";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { Effect } from "effect";
import { expect } from "vitest";
import * as LedgerSignatureService from "./LedgerSignatureService.js";

// Setup sha512 for ed25519
ed.hashes.sha512 = sha512;

describe("LedgerSignatureService", () => {
  describe("verify", () => {
    it.effect("should return true for valid signature", () =>
      Effect.gen(function* () {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = PublicKey.make(ed.getPublicKey(privateKey));
        const message = new TextEncoder().encode("test message");

        const signatureBytes = ed.sign(message, privateKey);
        const signature = Signature.make(signatureBytes);

        const isValid = yield* LedgerSignatureService.verify(message, signature, publicKey);

        expect(isValid).toBe(true);
      }));

    it.effect("should return false for invalid signature", () =>
      Effect.gen(function* () {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = PublicKey.make(ed.getPublicKey(privateKey));
        const message = new TextEncoder().encode("test message");

        // Create an invalid signature (all zeros)
        const invalidSignature = Signature.make(new Uint8Array(64));

        const isValid = yield* LedgerSignatureService.verify(message, invalidSignature, publicKey);

        expect(isValid).toBe(false);
      }));

    it.effect("should return false when message is tampered", () =>
      Effect.gen(function* () {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = PublicKey.make(ed.getPublicKey(privateKey));
        const originalMessage = new TextEncoder().encode("original message");
        const tamperedMessage = new TextEncoder().encode("tampered message");

        const signatureBytes = ed.sign(originalMessage, privateKey);
        const signature = Signature.make(signatureBytes);

        const isValid = yield* LedgerSignatureService.verify(tamperedMessage, signature, publicKey);

        expect(isValid).toBe(false);
      }));

    it.effect("should return false for wrong public key", () =>
      Effect.gen(function* () {
        const privateKey1 = ed.utils.randomSecretKey();
        const privateKey2 = ed.utils.randomSecretKey();
        const wrongPublicKey = PublicKey.make(ed.getPublicKey(privateKey2));
        const message = new TextEncoder().encode("test message");

        const signatureBytes = ed.sign(message, privateKey1);
        const signature = Signature.make(signatureBytes);

        const isValid = yield* LedgerSignatureService.verify(message, signature, wrongPublicKey);

        expect(isValid).toBe(false);
      }));
  });

  describe("verifySync", () => {
    it("should return true for valid signature", () => {
      const privateKey = ed.utils.randomSecretKey();
      const publicKey = PublicKey.make(ed.getPublicKey(privateKey));
      const message = new TextEncoder().encode("test message");

      const signatureBytes = ed.sign(message, privateKey);
      const signature = Signature.make(signatureBytes);

      const isValid = LedgerSignatureService.verifySync(message, signature, publicKey);

      expect(isValid).toBe(true);
    });

    it("should return false for invalid signature", () => {
      const privateKey = ed.utils.randomSecretKey();
      const publicKey = PublicKey.make(ed.getPublicKey(privateKey));
      const message = new TextEncoder().encode("test message");

      const invalidSignature = Signature.make(new Uint8Array(64));

      const isValid = LedgerSignatureService.verifySync(message, invalidSignature, publicKey);

      expect(isValid).toBe(false);
    });
  });

  describe("verifyString", () => {
    it.effect("should verify string message correctly", () =>
      Effect.gen(function* () {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = PublicKey.make(ed.getPublicKey(privateKey));
        const message = "test transaction id";

        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = ed.sign(messageBytes, privateKey);
        const signature = Signature.make(signatureBytes);

        const isValid = yield* LedgerSignatureService.verifyString(message, signature, publicKey);

        expect(isValid).toBe(true);
      }));

    it.effect("should fail for tampered string message", () =>
      Effect.gen(function* () {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = PublicKey.make(ed.getPublicKey(privateKey));
        const originalMessage = "original";
        const tamperedMessage = "tampered";

        const messageBytes = new TextEncoder().encode(originalMessage);
        const signatureBytes = ed.sign(messageBytes, privateKey);
        const signature = Signature.make(signatureBytes);

        const isValid = yield* LedgerSignatureService.verifyString(
          tamperedMessage,
          signature,
          publicKey
        );

        expect(isValid).toBe(false);
      }));
  });
});
