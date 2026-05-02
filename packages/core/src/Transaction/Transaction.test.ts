import { describe, it } from "@effect/vitest";
import { Schema } from "effect";
import { expect } from "vitest";
import { Address } from "../primitives/Address.js";
import { Amount } from "../primitives/Amount.js";
import { PublicKey } from "../primitives/PublicKey.js";
import { Signature } from "../primitives/Signature.js";
import { TransactionId } from "../primitives/TransactionId.js";
import { TxOutputIndex } from "../primitives/TxOutputIndex.js";
import {
  Transaction,
  TransactionInput,
  TransactionOutput,
  UnsignedTransactionInput
} from "./Transaction.js";

describe("Transaction schemas", () => {
  describe("TransactionInput", () => {
    const validInput = {
      txOutputId: TransactionId.make("abc123"),
      txOutputIndex: TxOutputIndex.make(0),
      signature: Signature.make(new Uint8Array(64)),
      publicKey: PublicKey.make(new Uint8Array(32))
    };

    it("should accept valid TransactionInput", () => {
      const result = TransactionInput.make(validInput);

      expect(result.txOutputId).toBe("abc123");
      expect(result.txOutputIndex).toBe(0);
    });

    it("should encode and decode TransactionInput", () => {
      const input = TransactionInput.make(validInput);
      const encoded = Schema.encodeSync(TransactionInput)(input);
      const decoded = Schema.decodeSync(TransactionInput)(encoded);

      expect(decoded.txOutputId).toBe(input.txOutputId);
      expect(decoded.txOutputIndex).toBe(input.txOutputIndex);
    });
  });

  describe("UnsignedTransactionInput", () => {
    it("should only include txOutputId and txOutputIndex", () => {
      const unsignedInput = {
        txOutputId: TransactionId.make("abc123"),
        txOutputIndex: TxOutputIndex.make(0)
      };

      const result = Schema.decodeSync(UnsignedTransactionInput)(unsignedInput);

      expect(result.txOutputId).toBe("abc123");
      expect(result.txOutputIndex).toBe(0);
      expect("signature" in result).toBe(false);
      expect("publicKey" in result).toBe(false);
    });
  });

  describe("TransactionOutput", () => {
    it("should accept valid TransactionOutput", () => {
      const output = TransactionOutput.make({
        address: Address.make("0xabc123"),
        amount: Amount.make(100)
      });

      expect(output.address).toBe("0xabc123");
      expect(output.amount).toBe(100);
    });

    it("should encode and decode TransactionOutput", () => {
      const output = TransactionOutput.make({
        address: Address.make("0xabc123"),
        amount: Amount.make(100)
      });

      const encoded = Schema.encodeSync(TransactionOutput)(output);
      const decoded = Schema.decodeSync(TransactionOutput)(encoded);

      expect(decoded.address).toBe(output.address);
      expect(decoded.amount).toBe(output.amount);
    });

    it("should reject negative amounts", () => {
      expect(() =>
        TransactionOutput.make({
          address: Address.make("0xabc123"),
          amount: Amount.make(-1)
        })
      ).toThrow();
    });
  });

  describe("Transaction", () => {
    const validTransaction = {
      id: TransactionId.make("txid123"),
      inputs: [
        {
          txOutputId: TransactionId.make("prevtx"),
          txOutputIndex: TxOutputIndex.make(0),
          signature: Signature.make(new Uint8Array(64)),
          publicKey: PublicKey.make(new Uint8Array(32))
        }
      ],
      outputs: [
        {
          address: Address.make("0xrecipient"),
          amount: Amount.make(50)
        }
      ]
    };

    it("should accept valid Transaction", () => {
      const tx = Transaction.make(validTransaction);

      expect(tx.id).toBe("txid123");
      expect(tx.inputs).toHaveLength(1);
      expect(tx.outputs).toHaveLength(1);
    });

    it("should be an instance of Transaction class", () => {
      const tx = Transaction.make(validTransaction);

      expect(tx).toBeInstanceOf(Transaction);
    });

    it("should accept transaction with multiple inputs and outputs", () => {
      const tx = Transaction.make({
        id: TransactionId.make("txid456"),
        inputs: [
          {
            txOutputId: TransactionId.make("prevtx1"),
            txOutputIndex: TxOutputIndex.make(0),
            signature: Signature.make(new Uint8Array(64)),
            publicKey: PublicKey.make(new Uint8Array(32))
          },
          {
            txOutputId: TransactionId.make("prevtx2"),
            txOutputIndex: TxOutputIndex.make(1),
            signature: Signature.make(new Uint8Array(64)),
            publicKey: PublicKey.make(new Uint8Array(32))
          }
        ],
        outputs: [
          {
            address: Address.make("0xrecipient1"),
            amount: Amount.make(30)
          },
          {
            address: Address.make("0xrecipient2"),
            amount: Amount.make(20)
          }
        ]
      });

      expect(tx.inputs).toHaveLength(2);
      expect(tx.outputs).toHaveLength(2);
    });

    it("should accept transaction with empty inputs (for coinbase)", () => {
      const tx = Transaction.make({
        id: TransactionId.make("coinbase"),
        inputs: [],
        outputs: [
          {
            address: Address.make("0xminer"),
            amount: Amount.make(50)
          }
        ]
      });

      expect(tx.inputs).toHaveLength(0);
      expect(tx.outputs).toHaveLength(1);
    });
  });
});
