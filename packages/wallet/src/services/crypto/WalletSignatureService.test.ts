import { describe } from "@effect/vitest";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { Effect } from "effect";
import { expect } from "vitest";
import * as WalletKeyPairService from "./WalletKeyPairService.js";
import * as WalletSignatureService from "./WalletSignatureService.js";

// Setup sha512 for ed25519
ed.hashes.sha512 = sha512;

describe("WalletSignatureService", () => {
  describe("sign", (it) => {
    it("should produce valid Ed25519 signature", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();
        const publicKey = yield* WalletKeyPairService.derivePublicKey(privateKey);
        const message = new TextEncoder().encode("test message");

        const signature = yield* WalletSignatureService.sign(message, privateKey);

        expect(signature).toBeInstanceOf(Uint8Array);
        expect(signature.length).toBe(64); // Ed25519 signature is 64 bytes

        // Verify the signature is valid
        const isValid = ed.verify(signature, message, publicKey);
        expect(isValid).toBe(true);
      }));

    it("should produce deterministic signature for same input", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();
        const message = new TextEncoder().encode("test message");

        const sig1 = yield* WalletSignatureService.sign(message, privateKey);
        const sig2 = yield* WalletSignatureService.sign(message, privateKey);

        expect(Buffer.from(sig1).toString("hex")).toBe(Buffer.from(sig2).toString("hex"));
      }));

    it("should produce different signatures for different messages", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();
        const message1 = new TextEncoder().encode("message 1");
        const message2 = new TextEncoder().encode("message 2");

        const sig1 = yield* WalletSignatureService.sign(message1, privateKey);
        const sig2 = yield* WalletSignatureService.sign(message2, privateKey);

        expect(Buffer.from(sig1).toString("hex")).not.toBe(Buffer.from(sig2).toString("hex"));
      }));

    it("should produce different signatures for different keys", () =>
      Effect.gen(function* () {
        const privateKey1 = yield* WalletKeyPairService.generatePrivateKey();
        const privateKey2 = yield* WalletKeyPairService.generatePrivateKey();
        const message = new TextEncoder().encode("test message");

        const sig1 = yield* WalletSignatureService.sign(message, privateKey1);
        const sig2 = yield* WalletSignatureService.sign(message, privateKey2);

        expect(Buffer.from(sig1).toString("hex")).not.toBe(Buffer.from(sig2).toString("hex"));
      }));
  });

  describe("signSync", (it) => {
    it("should produce same signature as async version", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();
        const message = new TextEncoder().encode("test message");

        const asyncSig = yield* WalletSignatureService.sign(message, privateKey);
        const syncSig = WalletSignatureService.signSync(message, privateKey);

        expect(Buffer.from(asyncSig).toString("hex")).toBe(Buffer.from(syncSig).toString("hex"));
      }));

    it("should produce valid signature", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();
        const publicKey = yield* WalletKeyPairService.derivePublicKey(privateKey);
        const message = new TextEncoder().encode("test message");

        const signature = WalletSignatureService.signSync(message, privateKey);

        const isValid = ed.verify(signature, message, publicKey);
        expect(isValid).toBe(true);
      }));
  });

  describe("signString", (it) => {
    it("should sign string message correctly", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();
        const publicKey = yield* WalletKeyPairService.derivePublicKey(privateKey);
        const message = "transaction-id-123";

        const signature = yield* WalletSignatureService.signString(message, privateKey);

        // Verify by converting string to bytes
        const messageBytes = new TextEncoder().encode(message);
        const isValid = ed.verify(signature, messageBytes, publicKey);
        expect(isValid).toBe(true);
      }));

    it("should produce equivalent result to sign with encoded string", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();
        const message = "test message";

        const stringSig = yield* WalletSignatureService.signString(message, privateKey);
        const bytesSig = yield* WalletSignatureService.sign(
          new TextEncoder().encode(message),
          privateKey
        );

        expect(Buffer.from(stringSig).toString("hex")).toBe(Buffer.from(bytesSig).toString("hex"));
      }));
  });
});
