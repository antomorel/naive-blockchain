import { describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { Address } from "../primitives/Address.js";
import { Amount } from "../primitives/Amount.js";
import { TransactionId } from "../primitives/TransactionId.js";
import { TxOutputIndex } from "../primitives/TxOutputIndex.js";
import { makeTransactionId } from "./makeTransactionId.js";
import type { TransactionOutput, UnsignedTransactionInput } from "./Transaction.js";

const makeTestInput = (txId: string, index: number): UnsignedTransactionInput => ({
  txOutputId: TransactionId.make(txId),
  txOutputIndex: TxOutputIndex.make(index)
});

const makeTestOutput = (address: string, amount: number): TransactionOutput => ({
  address: Address.make(address),
  amount: Amount.make(amount)
});

describe("makeTransactionId", () => {
  describe("determinism", () => {
    it.effect("should produce the same ID for identical inputs and outputs", () =>
      Effect.gen(function* () {
        const inputs = [makeTestInput("tx123", 0)];
        const outputs = [makeTestOutput("0xabc", 100)];

        const id1 = yield* makeTransactionId(inputs, outputs);
        const id2 = yield* makeTransactionId(inputs, outputs);

        expect(id1).toBe(id2);
      })
    );

    it.effect("should produce different IDs for different inputs", () =>
      Effect.gen(function* () {
        const outputs = [makeTestOutput("0xabc", 100)];

        const id1 = yield* makeTransactionId([makeTestInput("tx123", 0)], outputs);
        const id2 = yield* makeTransactionId([makeTestInput("tx456", 0)], outputs);

        expect(id1).not.toBe(id2);
      })
    );

    it.effect("should produce different IDs for different outputs", () =>
      Effect.gen(function* () {
        const inputs = [makeTestInput("tx123", 0)];

        const id1 = yield* makeTransactionId(inputs, [makeTestOutput("0xabc", 100)]);
        const id2 = yield* makeTransactionId(inputs, [makeTestOutput("0xdef", 100)]);

        expect(id1).not.toBe(id2);
      })
    );

    it.effect("should produce different IDs for different amounts", () =>
      Effect.gen(function* () {
        const inputs = [makeTestInput("tx123", 0)];

        const id1 = yield* makeTransactionId(inputs, [makeTestOutput("0xabc", 100)]);
        const id2 = yield* makeTransactionId(inputs, [makeTestOutput("0xabc", 200)]);

        expect(id1).not.toBe(id2);
      })
    );
  });

  describe("format", () => {
    it.effect("should return a 64-character hex string (SHA-256 hash)", () =>
      Effect.gen(function* () {
        const inputs = [makeTestInput("tx123", 0)];
        const outputs = [makeTestOutput("0xabc", 100)];

        const id = yield* makeTransactionId(inputs, outputs);

        expect(id).toMatch(/^[a-f0-9]{64}$/);
      })
    );

    it.effect("should be a branded TransactionId type", () =>
      Effect.gen(function* () {
        const inputs = [makeTestInput("tx123", 0)];
        const outputs = [makeTestOutput("0xabc", 100)];

        const id = yield* makeTransactionId(inputs, outputs);

        // TypeScript would fail if this wasn't a TransactionId
        const _typeCheck: TransactionId = id;
        expect(typeof _typeCheck).toBe("string");
      })
    );
  });

  describe("edge cases", () => {
    it.effect("should handle empty inputs array", () =>
      Effect.gen(function* () {
        const outputs = [makeTestOutput("0xabc", 100)];

        const id = yield* makeTransactionId([], outputs);

        expect(id).toMatch(/^[a-f0-9]{64}$/);
      })
    );

    it.effect("should handle empty outputs array", () =>
      Effect.gen(function* () {
        const inputs = [makeTestInput("tx123", 0)];

        const id = yield* makeTransactionId(inputs, []);

        expect(id).toMatch(/^[a-f0-9]{64}$/);
      })
    );

    it.effect("should handle both empty arrays", () =>
      Effect.gen(function* () {
        const id = yield* makeTransactionId([], []);

        expect(id).toMatch(/^[a-f0-9]{64}$/);
      })
    );

    it.effect("should handle multiple inputs and outputs", () =>
      Effect.gen(function* () {
        const inputs = [
          makeTestInput("tx123", 0),
          makeTestInput("tx456", 1),
          makeTestInput("tx789", 2)
        ];
        const outputs = [
          makeTestOutput("0xabc", 50),
          makeTestOutput("0xdef", 100),
          makeTestOutput("0xghi", 150)
        ];

        const id = yield* makeTransactionId(inputs, outputs);

        expect(id).toMatch(/^[a-f0-9]{64}$/);
      })
    );

    it.effect("should differentiate based on input index", () =>
      Effect.gen(function* () {
        const outputs = [makeTestOutput("0xabc", 100)];

        const id1 = yield* makeTransactionId([makeTestInput("tx123", 0)], outputs);
        const id2 = yield* makeTransactionId([makeTestInput("tx123", 1)], outputs);

        expect(id1).not.toBe(id2);
      })
    );
  });
});
