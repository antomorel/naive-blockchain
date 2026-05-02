import { Address } from "@blockchain/core/primitives/Address";
import { Amount } from "@blockchain/core/primitives/Amount";
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight";
import { PublicKey } from "@blockchain/core/primitives/PublicKey";
import { Signature } from "@blockchain/core/primitives/Signature";
import { TransactionId } from "@blockchain/core/primitives/TransactionId";
import { TxOutputIndex } from "@blockchain/core/primitives/TxOutputIndex";
import { makeTransactionId } from "@blockchain/core/Transaction/makeTransactionId";
import type { TransactionInput } from "@blockchain/core/Transaction/Transaction";
import { Transaction } from "@blockchain/core/Transaction/Transaction";
import type { UTXO } from "@blockchain/core/UTXO/UTXO";
import { describe, it } from "@effect/vitest";
import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { Effect, Layer } from "effect";
import { expect } from "vitest";
import { COINBASE_AMOUNT } from "../domain/constants.js";
import { UTXOSet } from "../domain/UTXOSet.js";
import * as TransactionService from "./TransactionService.js";

// Setup sha512 for ed25519
ed.hashes.sha512 = sha512;

// Helper to derive address from public key (same logic as LedgerKeyPairService)
const deriveAddressFromPublicKey = (publicKey: PublicKey): Address => {
  const hash = sha256(publicKey);
  const addressBytes = hash.slice(0, 20);
  return Address.make("0x" + bytesToHex(addressBytes));
};

// Create a mock UTXOSet for testing
const createMockUTXOSet = (utxos: Map<string, UTXO>) => {
  const MockUTXOSet = Layer.succeed(UTXOSet, {
    find: (transactionId, txOutputIndex) => {
      const key = `${transactionId}:${txOutputIndex}`;
      const utxo = utxos.get(key);
      if (utxo) {
        return Effect.succeed(utxo);
      }
      return Effect.fail({
        _tag: "UTXONotFoundError" as const,
        transactionId,
        txOutputIndex
      });
    },
    add: () => Effect.void,
    remove: () => Effect.void,
    getInputsTotalValue: (inputs) =>
      Effect.gen(function* () {
        let total = 0;
        for (const input of inputs) {
          const key = `${input.txOutputId}:${input.txOutputIndex}`;
          const utxo = utxos.get(key);
          if (utxo) {
            total += utxo.amount;
          }
        }
        return Amount.make(total);
      }),
    getBalance: () => Effect.succeed(Amount.make(0)),
    findAllByAddressOrderedByAmountDesc: () => Effect.succeed([])
  });
  return MockUTXOSet;
};

describe("TransactionService", () => {
  describe("isTxInputValid", () => {
    it.effect("should return true for valid transaction input", () =>
      Effect.gen(function* () {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = PublicKey.make(ed.getPublicKey(privateKey));
        const address = deriveAddressFromPublicKey(publicKey);

        const txOutputId = TransactionId.make("previous-tx-id");
        const txOutputIndex = TxOutputIndex.make(0);
        const transactionId = TransactionId.make("current-tx-id");

        // Create UTXO
        const utxo: UTXO = {
          txOutputId,
          txOutputIndex,
          address,
          amount: Amount.make(100)
        };

        // Sign the transaction ID
        const messageBytes = new TextEncoder().encode(transactionId);
        const signatureBytes = ed.sign(messageBytes, privateKey);

        const txInput: TransactionInput = {
          txOutputId,
          txOutputIndex,
          signature: Signature.make(signatureBytes),
          publicKey
        };

        const utxoMap = new Map([[`${txOutputId}:${txOutputIndex}`, utxo]]);
        const mockLayer = createMockUTXOSet(utxoMap);

        const isValid = yield* TransactionService.isTxInputValid(txInput, transactionId).pipe(
          Effect.provide(mockLayer)
        );

        expect(isValid).toBe(true);
      })
    );

    it.effect("should return false when UTXO not found", () =>
      Effect.gen(function* () {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = PublicKey.make(ed.getPublicKey(privateKey));

        const txOutputId = TransactionId.make("nonexistent-tx");
        const txOutputIndex = TxOutputIndex.make(0);
        const transactionId = TransactionId.make("current-tx-id");

        const messageBytes = new TextEncoder().encode(transactionId);
        const signatureBytes = ed.sign(messageBytes, privateKey);

        const txInput: TransactionInput = {
          txOutputId,
          txOutputIndex,
          signature: Signature.make(signatureBytes),
          publicKey
        };

        const mockLayer = createMockUTXOSet(new Map());

        const isValid = yield* TransactionService.isTxInputValid(txInput, transactionId).pipe(
          Effect.provide(mockLayer)
        );

        expect(isValid).toBe(false);
      })
    );

    it.effect("should return false when public key does not match UTXO address", () =>
      Effect.gen(function* () {
        const privateKey1 = ed.utils.randomSecretKey();
        const publicKey1 = PublicKey.make(ed.getPublicKey(privateKey1));

        const privateKey2 = ed.utils.randomSecretKey();
        const publicKey2 = PublicKey.make(ed.getPublicKey(privateKey2));
        const address2 = deriveAddressFromPublicKey(publicKey2);

        const txOutputId = TransactionId.make("previous-tx-id");
        const txOutputIndex = TxOutputIndex.make(0);
        const transactionId = TransactionId.make("current-tx-id");

        // UTXO belongs to address2, but we're using publicKey1
        const utxo: UTXO = {
          txOutputId,
          txOutputIndex,
          address: address2,
          amount: Amount.make(100)
        };

        const messageBytes = new TextEncoder().encode(transactionId);
        const signatureBytes = ed.sign(messageBytes, privateKey1);

        const txInput: TransactionInput = {
          txOutputId,
          txOutputIndex,
          signature: Signature.make(signatureBytes),
          publicKey: publicKey1 // Wrong public key
        };

        const utxoMap = new Map([[`${txOutputId}:${txOutputIndex}`, utxo]]);
        const mockLayer = createMockUTXOSet(utxoMap);

        const isValid = yield* TransactionService.isTxInputValid(txInput, transactionId).pipe(
          Effect.provide(mockLayer)
        );

        expect(isValid).toBe(false);
      })
    );

    it.effect("should return false for invalid signature", () =>
      Effect.gen(function* () {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = PublicKey.make(ed.getPublicKey(privateKey));
        const address = deriveAddressFromPublicKey(publicKey);

        const txOutputId = TransactionId.make("previous-tx-id");
        const txOutputIndex = TxOutputIndex.make(0);
        const transactionId = TransactionId.make("current-tx-id");

        const utxo: UTXO = {
          txOutputId,
          txOutputIndex,
          address,
          amount: Amount.make(100)
        };

        // Invalid signature (all zeros)
        const txInput: TransactionInput = {
          txOutputId,
          txOutputIndex,
          signature: Signature.make(new Uint8Array(64)),
          publicKey
        };

        const utxoMap = new Map([[`${txOutputId}:${txOutputIndex}`, utxo]]);
        const mockLayer = createMockUTXOSet(utxoMap);

        const isValid = yield* TransactionService.isTxInputValid(txInput, transactionId).pipe(
          Effect.provide(mockLayer)
        );

        expect(isValid).toBe(false);
      })
    );
  });

  describe("areTxOutputsValid", () => {
    it.effect("should return true when input and output totals match", () =>
      Effect.gen(function* () {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = PublicKey.make(ed.getPublicKey(privateKey));
        const address = deriveAddressFromPublicKey(publicKey);

        const txOutputId = TransactionId.make("previous-tx-id");
        const txOutputIndex = TxOutputIndex.make(0);

        const utxo: UTXO = {
          txOutputId,
          txOutputIndex,
          address,
          amount: Amount.make(100)
        };

        const transaction = Transaction.make({
          id: TransactionId.make("tx-id"),
          inputs: [
            {
              txOutputId,
              txOutputIndex,
              signature: Signature.make(new Uint8Array(64)),
              publicKey
            }
          ],
          outputs: [
            {
              address: Address.make("0xrecipient"),
              amount: Amount.make(100) // Matches input
            }
          ]
        });

        const utxoMap = new Map([[`${txOutputId}:${txOutputIndex}`, utxo]]);
        const mockLayer = createMockUTXOSet(utxoMap);

        const isValid = yield* TransactionService.areTxOutputsValid(transaction).pipe(
          Effect.provide(mockLayer)
        );

        expect(isValid).toBe(true);
      })
    );

    it.effect("should return false when output total exceeds input total", () =>
      Effect.gen(function* () {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = PublicKey.make(ed.getPublicKey(privateKey));
        const address = deriveAddressFromPublicKey(publicKey);

        const txOutputId = TransactionId.make("previous-tx-id");
        const txOutputIndex = TxOutputIndex.make(0);

        const utxo: UTXO = {
          txOutputId,
          txOutputIndex,
          address,
          amount: Amount.make(100)
        };

        const transaction = Transaction.make({
          id: TransactionId.make("tx-id"),
          inputs: [
            {
              txOutputId,
              txOutputIndex,
              signature: Signature.make(new Uint8Array(64)),
              publicKey
            }
          ],
          outputs: [
            {
              address: Address.make("0xrecipient"),
              amount: Amount.make(150) // Exceeds input
            }
          ]
        });

        const utxoMap = new Map([[`${txOutputId}:${txOutputIndex}`, utxo]]);
        const mockLayer = createMockUTXOSet(utxoMap);

        const isValid = yield* TransactionService.areTxOutputsValid(transaction).pipe(
          Effect.provide(mockLayer)
        );

        expect(isValid).toBe(false);
      })
    );
  });

  describe("isCoinbaseTxValid", () => {
    it.effect("should return true for valid coinbase transaction", () =>
      Effect.gen(function* () {
        const blockHeight = BlockHeight.make(1);

        const inputs = [
          {
            txOutputId: TransactionId.make(""),
            txOutputIndex: TxOutputIndex.make(blockHeight) // Must match block height
          }
        ];

        const outputs = [
          {
            address: Address.make("0xminer"),
            amount: COINBASE_AMOUNT
          }
        ];

        const txId = yield* makeTransactionId(inputs, outputs);

        const coinbaseTx = Transaction.make({
          id: txId,
          inputs: [
            {
              ...inputs[0],
              signature: Signature.make(new Uint8Array(64)),
              publicKey: PublicKey.make(new Uint8Array(32))
            }
          ],
          outputs
        });

        const isValid = yield* TransactionService.isCoinbaseTxValid(coinbaseTx, blockHeight);

        expect(isValid).toBe(true);
      })
    );

    it.effect("should return false when transaction ID is incorrect", () =>
      Effect.gen(function* () {
        const blockHeight = BlockHeight.make(1);

        const coinbaseTx = Transaction.make({
          id: TransactionId.make("wrong-id"),
          inputs: [
            {
              txOutputId: TransactionId.make(""),
              txOutputIndex: TxOutputIndex.make(blockHeight),
              signature: Signature.make(new Uint8Array(64)),
              publicKey: PublicKey.make(new Uint8Array(32))
            }
          ],
          outputs: [
            {
              address: Address.make("0xminer"),
              amount: COINBASE_AMOUNT
            }
          ]
        });

        const isValid = yield* TransactionService.isCoinbaseTxValid(coinbaseTx, blockHeight);

        expect(isValid).toBe(false);
      })
    );

    it.effect("should return false when coinbase has multiple inputs", () =>
      Effect.gen(function* () {
        const blockHeight = BlockHeight.make(1);

        const inputs = [
          {
            txOutputId: TransactionId.make(""),
            txOutputIndex: TxOutputIndex.make(blockHeight)
          },
          {
            txOutputId: TransactionId.make("extra"),
            txOutputIndex: TxOutputIndex.make(0)
          }
        ];

        const outputs = [
          {
            address: Address.make("0xminer"),
            amount: COINBASE_AMOUNT
          }
        ];

        const txId = yield* makeTransactionId(inputs, outputs);

        const coinbaseTx = Transaction.make({
          id: txId,
          inputs: inputs.map((input) => ({
            ...input,
            signature: Signature.make(new Uint8Array(64)),
            publicKey: PublicKey.make(new Uint8Array(32))
          })),
          outputs
        });

        const isValid = yield* TransactionService.isCoinbaseTxValid(coinbaseTx, blockHeight);

        expect(isValid).toBe(false);
      })
    );

    it.effect("should return false when input index does not match block height", () =>
      Effect.gen(function* () {
        const blockHeight = BlockHeight.make(1);

        const inputs = [
          {
            txOutputId: TransactionId.make(""),
            txOutputIndex: TxOutputIndex.make(999) // Wrong index
          }
        ];

        const outputs = [
          {
            address: Address.make("0xminer"),
            amount: COINBASE_AMOUNT
          }
        ];

        const txId = yield* makeTransactionId(inputs, outputs);

        const coinbaseTx = Transaction.make({
          id: txId,
          inputs: [
            {
              ...inputs[0],
              signature: Signature.make(new Uint8Array(64)),
              publicKey: PublicKey.make(new Uint8Array(32))
            }
          ],
          outputs
        });

        const isValid = yield* TransactionService.isCoinbaseTxValid(coinbaseTx, blockHeight);

        expect(isValid).toBe(false);
      })
    );

    it.effect("should return false when coinbase has multiple outputs", () =>
      Effect.gen(function* () {
        const blockHeight = BlockHeight.make(1);

        const inputs = [
          {
            txOutputId: TransactionId.make(""),
            txOutputIndex: TxOutputIndex.make(blockHeight)
          }
        ];

        const outputs = [
          {
            address: Address.make("0xminer"),
            amount: Amount.make(25)
          },
          {
            address: Address.make("0xother"),
            amount: Amount.make(25)
          }
        ];

        const txId = yield* makeTransactionId(inputs, outputs);

        const coinbaseTx = Transaction.make({
          id: txId,
          inputs: [
            {
              ...inputs[0],
              signature: Signature.make(new Uint8Array(64)),
              publicKey: PublicKey.make(new Uint8Array(32))
            }
          ],
          outputs
        });

        const isValid = yield* TransactionService.isCoinbaseTxValid(coinbaseTx, blockHeight);

        expect(isValid).toBe(false);
      })
    );

    it.effect("should return false when coinbase amount is wrong", () =>
      Effect.gen(function* () {
        const blockHeight = BlockHeight.make(1);

        const inputs = [
          {
            txOutputId: TransactionId.make(""),
            txOutputIndex: TxOutputIndex.make(blockHeight)
          }
        ];

        const outputs = [
          {
            address: Address.make("0xminer"),
            amount: Amount.make(100) // Wrong amount
          }
        ];

        const txId = yield* makeTransactionId(inputs, outputs);

        const coinbaseTx = Transaction.make({
          id: txId,
          inputs: [
            {
              ...inputs[0],
              signature: Signature.make(new Uint8Array(64)),
              publicKey: PublicKey.make(new Uint8Array(32))
            }
          ],
          outputs
        });

        const isValid = yield* TransactionService.isCoinbaseTxValid(coinbaseTx, blockHeight);

        expect(isValid).toBe(false);
      })
    );
  });
});
