import type { UTXO } from "@blockchain/core/UTXO/UTXO";
import { Effect, Layer } from "effect";
import { LedgerRpcClient } from "../domain/Ledger/LedgerRpcClient";

export const createMockLedgerRpcClient = (utxos: ReadonlyArray<UTXO>) =>
  Layer.succeed(
    LedgerRpcClient,
    LedgerRpcClient.of({
      findAllByAddressOrderedByAmountDesc: () => Effect.succeed(utxos) as any, // eslint-disable-line
      sendTransaction: () => Effect.void
    })
  );
