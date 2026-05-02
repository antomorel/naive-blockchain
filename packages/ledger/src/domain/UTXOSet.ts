import type { Address } from "@blockchain/core/primitives/Address";
import { Amount } from "@blockchain/core/primitives/Amount";
import type { TransactionId } from "@blockchain/core/primitives/TransactionId";
import type { TxOutputIndex } from "@blockchain/core/primitives/TxOutputIndex";
import type { UTXO } from "@blockchain/core/UTXO/UTXO";
import {
  Array,
  Context,
  Data,
  Effect,
  flow,
  HashMap,
  Layer,
  Number,
  Option,
  Order,
  pipe,
  Result,
  Tuple
} from "effect";
import type { TransactionInput } from "../../../core/src/Transaction/Transaction";

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

class DbKey extends Data.Class<{
  transactionId: TransactionId;
  txOutputIndex: TxOutputIndex;
}> {}

export class InMemoryUTXOSet implements UTXOSet {
  protected db: HashMap.HashMap<DbKey, UTXO> = HashMap.empty();

  static Live = Layer.succeed(UTXOSet, new InMemoryUTXOSet());

  find = (transactionId: TransactionId, txOutputIndex: TxOutputIndex) =>
    HashMap.get(this.db, new DbKey({ transactionId, txOutputIndex })).pipe(
      Option.match({
        onNone: () => Effect.fail(new UTXONotFoundError({ transactionId, txOutputIndex })),
        onSome: (utxo) => Effect.succeed(utxo)
      })
    );

  add = (utxos: ReadonlyArray<UTXO>) => {
    const entries = Array.map(utxos, (utxo) =>
      Tuple.make(
        new DbKey({ transactionId: utxo.txOutputId, txOutputIndex: utxo.txOutputIndex }),
        utxo
      )
    );

    this.db = HashMap.setMany(this.db, entries);

    return Effect.void;
  };

  remove = (
    consumed: ReadonlyArray<{
      txOutputId: TransactionId;
      txOutputIndex: TxOutputIndex;
    }>
  ) => {
    const entries = Array.map(
      consumed,
      ({ txOutputId, txOutputIndex }) => new DbKey({ transactionId: txOutputId, txOutputIndex })
    );

    this.db = HashMap.removeMany(this.db, entries);

    return Effect.void;
  };

  getInputsTotalValue = (inputs: ReadonlyArray<TransactionInput>) => {
    const utxoAmounts = Array.filterMap(inputs, (txIn) =>
      HashMap.get(
        this.db,
        new DbKey({ transactionId: txIn.txOutputId, txOutputIndex: txIn.txOutputIndex })
      ).pipe(
        Option.map((utxo) => utxo.amount),
        Result.fromOption(() => Result.failVoid)
      )
    );

    return pipe(utxoAmounts, Number.ReducerSum.combineAll, Amount.make, Effect.succeed);
  };

  getBalance = (address: Address) => {
    const utxosOfAddressAmounts = pipe(
      HashMap.values(this.db),
      Array.filterMap(
        flow(
          Result.liftPredicate(
            (utxo) => utxo.address === address,
            () => Result.failVoid
          ),
          Result.map((utxo) => utxo.amount)
        )
      )
    );

    return pipe(utxosOfAddressAmounts, Number.ReducerSum.combineAll, Amount.make, Effect.succeed);
  };

  findAllByAddressOrderedByAmountDesc = (address: Address) =>
    pipe(
      HashMap.values(this.db),
      Array.filterMap(
        Result.liftPredicate(
          (utxo) => utxo.address === address,
          () => Result.failVoid
        )
      ),
      Array.sortWith((utxo) => utxo.amount, Order.flip(Order.Number)),
      Effect.succeed
    );
}
