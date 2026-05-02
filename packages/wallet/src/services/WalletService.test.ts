import { Address } from "@blockchain/core/primitives/Address";
import { Amount } from "@blockchain/core/primitives/Amount";
import { TransactionId } from "@blockchain/core/primitives/TransactionId";
import { TxOutputIndex } from "@blockchain/core/primitives/TxOutputIndex";
import { TransactionOutput } from "@blockchain/core/Transaction/Transaction";
import type { UTXO } from "@blockchain/core/UTXO/UTXO";
import { describe, it } from "@effect/vitest";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { Cause, Effect, Exit, Predicate } from "effect";
import { expect } from "vitest";
import { createMockLedgerRpcClient } from "../test/mocks.js";
import * as WalletKeyPairService from "./crypto/WalletKeyPairService.js";
import * as WalletService from "./WalletService.js";

// Setup sha512 for ed25519
ed.hashes.sha512 = sha512;

const getFailureTag = (cause: Cause.Cause<unknown>) => {
  const firstReason = cause.reasons[0];
  if (Cause.isFailReason(firstReason) && Predicate.hasProperty(firstReason.error, "_tag")) {
    return firstReason.error._tag;
  }
  throw new Error("No failure reason found");
};

// Create mock UTXO helper
const makeUTXO = (txId: string, index: number, amount: number, address: string): UTXO => ({
  txOutputId: TransactionId.make(txId),
  txOutputIndex: TxOutputIndex.make(index),
  amount: Amount.make(amount),
  address: Address.make(address)
});

describe("WalletService", () => {
  describe("sendTransaction", () => {
    it.effect("should create valid transaction with exact amount", () =>
      Effect.gen(function* () {
        const keyPair = yield* WalletKeyPairService.generateKeyPair();

        const utxos = [makeUTXO("prev-tx", 0, 100, keyPair.address)];

        const recipientAddress = Address.make("0xrecipient12345678901234567890123456789012");
        const output = TransactionOutput.make({
          address: recipientAddress,
          amount: Amount.make(100)
        });

        const transaction = yield* WalletService.sendTransaction(output, keyPair.privateKey).pipe(
          Effect.provide(createMockLedgerRpcClient(utxos))
        );

        expect(transaction.id).toMatch(/^[a-f0-9]{64}$/);
        expect(transaction.inputs).toHaveLength(1);
        expect(transaction.outputs).toHaveLength(1); // No change output needed
        expect(transaction.outputs[0].address).toBe(recipientAddress);
        expect(transaction.outputs[0].amount).toBe(100);
      })
    );

    it.effect("should create transaction with change output when leftover exists", () =>
      Effect.gen(function* () {
        const keyPair = yield* WalletKeyPairService.generateKeyPair();

        const utxos = [makeUTXO("prev-tx", 0, 100, keyPair.address)];

        const recipientAddress = Address.make("0xrecipient12345678901234567890123456789012");
        const output = TransactionOutput.make({
          address: recipientAddress,
          amount: Amount.make(60) // 40 left over
        });

        const transaction = yield* WalletService.sendTransaction(output, keyPair.privateKey).pipe(
          Effect.provide(createMockLedgerRpcClient(utxos))
        );

        expect(transaction.outputs).toHaveLength(2); // Recipient + change

        // Find recipient and change outputs
        const recipientOutput = transaction.outputs.find((o) => o.address === recipientAddress);
        const changeOutput = transaction.outputs.find((o) => o.address === keyPair.address);

        expect(recipientOutput).toBeDefined();
        expect(recipientOutput?.amount).toBe(60);
        expect(changeOutput).toBeDefined();
        expect(changeOutput?.amount).toBe(40);
      })
    );

    it.effect("should sign all inputs with the private key", () =>
      Effect.gen(function* () {
        const keyPair = yield* WalletKeyPairService.generateKeyPair();

        const utxos = [
          makeUTXO("tx1", 0, 50, keyPair.address),
          makeUTXO("tx2", 0, 50, keyPair.address)
        ];

        const recipientAddress = Address.make("0xrecipient12345678901234567890123456789012");
        const output = TransactionOutput.make({
          address: recipientAddress,
          amount: Amount.make(100)
        });

        const transaction = yield* WalletService.sendTransaction(output, keyPair.privateKey).pipe(
          Effect.provide(createMockLedgerRpcClient(utxos))
        );

        // Verify each input has a valid signature
        for (const input of transaction.inputs) {
          expect(input.signature).toBeInstanceOf(Uint8Array);
          expect(input.signature.length).toBe(64);

          // Verify signature is valid for this transaction
          const isValid = ed.verify(
            input.signature,
            new TextEncoder().encode(transaction.id),
            input.publicKey
          );
          expect(isValid).toBe(true);
        }
      })
    );

    it.effect("should include correct public key in all inputs", () =>
      Effect.gen(function* () {
        const keyPair = yield* WalletKeyPairService.generateKeyPair();

        const utxos = [makeUTXO("prev-tx", 0, 100, keyPair.address)];

        const recipientAddress = Address.make("0xrecipient12345678901234567890123456789012");
        const output = TransactionOutput.make({
          address: recipientAddress,
          amount: Amount.make(100)
        });

        const transaction = yield* WalletService.sendTransaction(output, keyPair.privateKey).pipe(
          Effect.provide(createMockLedgerRpcClient(utxos))
        );

        for (const input of transaction.inputs) {
          expect(Buffer.from(input.publicKey).toString("hex")).toBe(
            Buffer.from(keyPair.publicKey).toString("hex")
          );
        }
      })
    );

    it.effect("should reference correct UTXOs in inputs", () =>
      Effect.gen(function* () {
        const keyPair = yield* WalletKeyPairService.generateKeyPair();

        const utxos = [
          makeUTXO("tx1", 0, 60, keyPair.address),
          makeUTXO("tx2", 1, 40, keyPair.address)
        ];

        const recipientAddress = Address.make("0xrecipient12345678901234567890123456789012");
        const output = TransactionOutput.make({
          address: recipientAddress,
          amount: Amount.make(100)
        });

        const transaction = yield* WalletService.sendTransaction(output, keyPair.privateKey).pipe(
          Effect.provide(createMockLedgerRpcClient(utxos))
        );

        // Inputs should reference the UTXOs that were selected
        const inputRefs = transaction.inputs.map((i) => `${i.txOutputId}:${i.txOutputIndex}`);
        expect(inputRefs).toContain("tx1:0");
        expect(inputRefs).toContain("tx2:1");
      })
    );

    it.effect("should fail when private key does not match UTXO addresses", () =>
      Effect.gen(function* () {
        const keyPair = yield* WalletKeyPairService.generateKeyPair();
        const otherKeyPair = yield* WalletKeyPairService.generateKeyPair();

        // UTXOs belong to different address
        const utxos = [makeUTXO("prev-tx", 0, 100, otherKeyPair.address)];

        const recipientAddress = Address.make("0xrecipient12345678901234567890123456789012");
        const output = TransactionOutput.make({
          address: recipientAddress,
          amount: Amount.make(100)
        });

        const result = yield* WalletService.sendTransaction(output, keyPair.privateKey).pipe(
          Effect.provide(createMockLedgerRpcClient(utxos)),
          Effect.exit
        );

        expect(Exit.isFailure(result)).toBe(true);
        if (Exit.isFailure(result)) {
          const error = getFailureTag(result.cause);
          expect(error).toBe("PrivateKeyNotMatchError");
        }
      })
    );

    it.effect("should generate deterministic transaction ID", () =>
      Effect.gen(function* () {
        const keyPair = yield* WalletKeyPairService.generateKeyPair();

        const utxos = [makeUTXO("prev-tx", 0, 100, keyPair.address)];

        const recipientAddress = Address.make("0xrecipient12345678901234567890123456789012");
        const output = TransactionOutput.make({
          address: recipientAddress,
          amount: Amount.make(100)
        });

        const tx1 = yield* WalletService.sendTransaction(output, keyPair.privateKey).pipe(
          Effect.provide(createMockLedgerRpcClient(utxos))
        );
        const tx2 = yield* WalletService.sendTransaction(output, keyPair.privateKey).pipe(
          Effect.provide(createMockLedgerRpcClient(utxos))
        );

        expect(tx1.id).toBe(tx2.id);
      })
    );
  });
});
