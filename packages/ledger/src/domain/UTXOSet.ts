import type { Address } from "@blockchain/core/primitives/Address";
import type { Amount } from "@blockchain/core/primitives/Amount";
import type { TransactionId } from "@blockchain/core/primitives/TransactionId";
import type { TxOutputIndex } from "@blockchain/core/primitives/TxOutputIndex";
import { Context, Data, Effect } from "effect";
import { TransactionInput } from "../../../core/src/Transaction/Transaction";
import { UTXO } from "@blockchain/core/UTXO/UTXO";

class UTXONotFoundError extends Data.TaggedError("UTXONotFoundError")<{
  transactionId: TransactionId;
  txOutputIndex: TxOutputIndex;
}> {}

class UTXOPersistenceError extends Data.TaggedError("UTXOPersistenceError")<{
  reason: string;
  cause: unknown;
}> {}

export interface UTXOSet {
  readonly find: (
    transactionId: TransactionId,
    txOutputIndex: TxOutputIndex
  ) => Effect.Effect<UTXO, UTXONotFoundError | UTXOPersistenceError>;

  readonly add: (utxos: ReadonlyArray<UTXO>) => Effect.Effect<void, UTXOPersistenceError>;

  readonly remove: (
    consumed: ReadonlyArray<{
      txOutputId: TransactionId;
      txOutputIndex: TxOutputIndex;
    }>
  ) => Effect.Effect<void, UTXOPersistenceError>;

  readonly getInputsTotalValue: (
    inputs: ReadonlyArray<TransactionInput>
  ) => Effect.Effect<Amount, UTXOPersistenceError>;

  readonly getBalance: (address: Address) => Effect.Effect<Amount, UTXOPersistenceError>;

  readonly findAllByAddressOrderedByAmountDesc: (
    address: Address
  ) => Effect.Effect<ReadonlyArray<UTXO>, UTXOPersistenceError>;
}

export const UTXOSet = Context.Service<UTXOSet>("UTXOSet");
