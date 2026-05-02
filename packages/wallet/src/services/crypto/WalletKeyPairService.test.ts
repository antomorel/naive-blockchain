import { describe } from "@effect/vitest";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { Effect } from "effect";
import { expect } from "vitest";
import * as WalletKeyPairService from "./WalletKeyPairService.js";

ed.hashes.sha512 = sha512;

describe("WalletKeyPairService", () => {
  describe("generatePrivateKey", (it) => {
    it("should generate a 32-byte private key", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();

        expect(privateKey).toBeInstanceOf(Uint8Array);
        expect(privateKey.length).toBe(32);
      }));

    it("should generate different keys each time", () =>
      Effect.gen(function* () {
        const key1 = yield* WalletKeyPairService.generatePrivateKey();
        const key2 = yield* WalletKeyPairService.generatePrivateKey();

        // Convert to hex for comparison
        const hex1 = Buffer.from(key1).toString("hex");
        const hex2 = Buffer.from(key2).toString("hex");

        expect(hex1).not.toBe(hex2);
      }));
  });

  describe("derivePublicKey", (it) => {
    it("should derive deterministic public key from private key", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();

        const publicKey1 = yield* WalletKeyPairService.derivePublicKey(privateKey);
        const publicKey2 = yield* WalletKeyPairService.derivePublicKey(privateKey);

        expect(Buffer.from(publicKey1).toString("hex")).toBe(
          Buffer.from(publicKey2).toString("hex")
        );
      }));

    it("should produce 32-byte public key (Ed25519)", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();
        const publicKey = yield* WalletKeyPairService.derivePublicKey(privateKey);

        expect(publicKey.length).toBe(32);
      }));

    it("should produce different public keys for different private keys", () =>
      Effect.gen(function* () {
        const privateKey1 = yield* WalletKeyPairService.generatePrivateKey();
        const privateKey2 = yield* WalletKeyPairService.generatePrivateKey();

        const publicKey1 = yield* WalletKeyPairService.derivePublicKey(privateKey1);
        const publicKey2 = yield* WalletKeyPairService.derivePublicKey(privateKey2);

        expect(Buffer.from(publicKey1).toString("hex")).not.toBe(
          Buffer.from(publicKey2).toString("hex")
        );
      }));
  });

  describe("derivePublicKeySync", (it) => {
    it("should produce same result as async version", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();

        const asyncPublicKey = yield* WalletKeyPairService.derivePublicKey(privateKey);
        const syncPublicKey = WalletKeyPairService.derivePublicKeySync(privateKey);

        expect(Buffer.from(asyncPublicKey).toString("hex")).toBe(
          Buffer.from(syncPublicKey).toString("hex")
        );
      }));
  });

  describe("deriveAddress", (it) => {
    it("should derive deterministic address from public key", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();
        const publicKey = yield* WalletKeyPairService.derivePublicKey(privateKey);

        const address1 = yield* WalletKeyPairService.deriveAddress(publicKey);
        const address2 = yield* WalletKeyPairService.deriveAddress(publicKey);

        expect(address1).toBe(address2);
      }));

    it("should produce address starting with 0x", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();
        const publicKey = yield* WalletKeyPairService.derivePublicKey(privateKey);
        const address = yield* WalletKeyPairService.deriveAddress(publicKey);

        expect(address.startsWith("0x")).toBe(true);
      }));

    it("should produce 42-character address", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();
        const publicKey = yield* WalletKeyPairService.derivePublicKey(privateKey);
        const address = yield* WalletKeyPairService.deriveAddress(publicKey);

        expect(address).toHaveLength(42);
        expect(address).toMatch(/^0x[a-f0-9]{40}$/);
      }));
  });

  describe("generateKeyPair", (it) => {
    it("should generate complete key pair", () =>
      Effect.gen(function* () {
        const keyPair = yield* WalletKeyPairService.generateKeyPair();

        expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
        expect(keyPair.privateKey.length).toBe(32);
        expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
        expect(keyPair.publicKey.length).toBe(32);
        expect(keyPair.address.startsWith("0x")).toBe(true);
        expect(keyPair.address).toHaveLength(42);
      }));

    it("should generate consistent address from keys", () =>
      Effect.gen(function* () {
        const keyPair = yield* WalletKeyPairService.generateKeyPair();

        const derivedPublicKey = yield* WalletKeyPairService.derivePublicKey(keyPair.privateKey);
        const derivedAddress = yield* WalletKeyPairService.deriveAddress(derivedPublicKey);

        expect(Buffer.from(keyPair.publicKey).toString("hex")).toBe(
          Buffer.from(derivedPublicKey).toString("hex")
        );
        expect(keyPair.address).toBe(derivedAddress);
      }));
  });

  describe("keyPairFromPrivateKey", (it) => {
    it("should reconstruct key pair from private key", () =>
      Effect.gen(function* () {
        const originalKeyPair = yield* WalletKeyPairService.generateKeyPair();
        const reconstructedKeyPair = yield* WalletKeyPairService.keyPairFromPrivateKey(
          originalKeyPair.privateKey
        );

        expect(Buffer.from(reconstructedKeyPair.publicKey).toString("hex")).toBe(
          Buffer.from(originalKeyPair.publicKey).toString("hex")
        );
        expect(reconstructedKeyPair.address).toBe(originalKeyPair.address);
      }));

    it("should produce deterministic result", () =>
      Effect.gen(function* () {
        const privateKey = yield* WalletKeyPairService.generatePrivateKey();

        const keyPair1 = yield* WalletKeyPairService.keyPairFromPrivateKey(privateKey);
        const keyPair2 = yield* WalletKeyPairService.keyPairFromPrivateKey(privateKey);

        expect(keyPair1.address).toBe(keyPair2.address);
        expect(Buffer.from(keyPair1.publicKey).toString("hex")).toBe(
          Buffer.from(keyPair2.publicKey).toString("hex")
        );
      }));
  });
});
