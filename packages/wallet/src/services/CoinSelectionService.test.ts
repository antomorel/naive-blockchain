import { Address } from "@blockchain/core/primitives/Address";
import { Amount } from "@blockchain/core/primitives/Amount";
import { TransactionId } from "@blockchain/core/primitives/TransactionId";
import { TxOutputIndex } from "@blockchain/core/primitives/TxOutputIndex";
import type { UTXO } from "@blockchain/core/UTXO/UTXO";
import { LedgerRpcClient } from "@blockchain/ledger-api/rpc/client";
import { describe, it } from "@effect/vitest";
import { Array, Cause, Effect, Exit, Layer, Predicate } from "effect";
import { expect } from "vitest";
import * as CoinSelectionService from "./CoinSelectionService.js";

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

// Create mock LedgerRpcClient
const createMockClient = (utxos: ReadonlyArray<UTXO>) =>
  Layer.succeed(
    LedgerRpcClient,
    LedgerRpcClient.of({
      findAllByAddressOrderedByAmountDesc: () => Effect.succeed(utxos) as any // eslint-disable-line
    })
  );

describe("CoinSelectionService", () => {
  describe("findForAmountAndAddress", () => {
    const testAddress = Address.make("0xtest1234567890abcdef1234567890abcdef12");

    it.effect("should find exact match using branch-and-bound", () =>
      Effect.gen(function* () {
        const utxos = [
          makeUTXO("tx1", 0, 50, testAddress),
          makeUTXO("tx2", 0, 30, testAddress),
          makeUTXO("tx3", 0, 20, testAddress)
        ];

        const mockClient = createMockClient(utxos);

        const result = yield* CoinSelectionService.findForAmountAndAddress(
          Amount.make(50),
          testAddress
        ).pipe(Effect.provide(mockClient));

        expect(result.leftOver).toBe(0);
        // Should find exact match
        const totalSelected = Array.reduce(result.selection, 0, (acc, u) => acc + u.amount);
        expect(totalSelected).toBe(50);
      })
    );

    it.effect("should find exact match with multiple UTXOs", () =>
      Effect.gen(function* () {
        const utxos = [
          makeUTXO("tx1", 0, 30, testAddress),
          makeUTXO("tx2", 0, 20, testAddress),
          makeUTXO("tx3", 0, 10, testAddress)
        ];

        const mockClient = createMockClient(utxos);

        const result = yield* CoinSelectionService.findForAmountAndAddress(
          Amount.make(50), // 30 + 20 = 50
          testAddress
        ).pipe(Effect.provide(mockClient));

        expect(result.leftOver).toBe(0);
        const totalSelected = Array.reduce(result.selection, 0, (acc, u) => acc + u.amount);
        expect(totalSelected).toBe(50);
      })
    );

    it.effect("should use accumulator when no exact match exists", () =>
      Effect.gen(function* () {
        const utxos = [makeUTXO("tx1", 0, 100, testAddress), makeUTXO("tx2", 0, 50, testAddress)];

        const mockClient = createMockClient(utxos);

        const result = yield* CoinSelectionService.findForAmountAndAddress(
          Amount.make(75), // No exact match possible
          testAddress
        ).pipe(Effect.provide(mockClient));

        // Should accumulate until we have enough
        const totalSelected = Array.reduce(result.selection, 0, (acc, u) => acc + u.amount);
        expect(totalSelected).toBeGreaterThanOrEqual(75);
        expect(result.leftOver).toBe(totalSelected - 75);
      })
    );

    it.effect("should fail with InsufficientFundsError when not enough UTXOs", () =>
      Effect.gen(function* () {
        const utxos = [makeUTXO("tx1", 0, 30, testAddress), makeUTXO("tx2", 0, 20, testAddress)];

        const mockClient = createMockClient(utxos);

        const result = yield* CoinSelectionService.findForAmountAndAddress(
          Amount.make(100), // More than available (50 total)
          testAddress
        ).pipe(Effect.provide(mockClient), Effect.exit);

        expect(Exit.isFailure(result)).toBe(true);
        if (Exit.isFailure(result)) {
          const error = getFailureTag(result.cause);
          expect(error).toBe("InsufficientFundsError");
        }
      })
    );

    it.effect("should return empty selection for zero amount", () =>
      Effect.gen(function* () {
        const utxos = [makeUTXO("tx1", 0, 100, testAddress)];

        const mockClient = createMockClient(utxos);

        const result = yield* CoinSelectionService.findForAmountAndAddress(
          Amount.make(0),
          testAddress
        ).pipe(Effect.provide(mockClient));

        expect(result.selection).toHaveLength(0);
        expect(result.leftOver).toBe(0);
      })
    );

    it.effect("should handle single UTXO exact match", () =>
      Effect.gen(function* () {
        const utxos = [makeUTXO("tx1", 0, 100, testAddress)];

        const mockClient = createMockClient(utxos);

        const result = yield* CoinSelectionService.findForAmountAndAddress(
          Amount.make(100),
          testAddress
        ).pipe(Effect.provide(mockClient));

        expect(result.selection).toHaveLength(1);
        expect(result.selection[0].amount).toBe(100);
        expect(result.leftOver).toBe(0);
      })
    );

    it.effect("should handle empty UTXO list", () =>
      Effect.gen(function* () {
        const mockClient = createMockClient([]);

        const result = yield* CoinSelectionService.findForAmountAndAddress(
          Amount.make(50),
          testAddress
        ).pipe(Effect.provide(mockClient), Effect.exit);

        expect(Exit.isFailure(result)).toBe(true);
        if (Exit.isFailure(result)) {
          const error = getFailureTag(result.cause);
          expect(error).toBe("InsufficientFundsError");
        }
      })
    );

    it.effect("should calculate correct leftover amount", () =>
      Effect.gen(function* () {
        const utxos = [makeUTXO("tx1", 0, 100, testAddress), makeUTXO("tx2", 0, 50, testAddress)];

        const mockClient = createMockClient(utxos);

        const result = yield* CoinSelectionService.findForAmountAndAddress(
          Amount.make(120),
          testAddress
        ).pipe(Effect.provide(mockClient));

        const totalSelected = Array.reduce(result.selection, 0, (acc, u) => acc + u.amount);
        expect(result.leftOver).toBe(totalSelected - 120);
      })
    );
  });
});
