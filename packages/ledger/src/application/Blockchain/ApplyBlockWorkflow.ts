import { TxOutputIndex } from "@blockchain/core/primitives/TxOutputIndex";
import { Transaction } from "@blockchain/core/Transaction/Transaction";
import { UTXO } from "@blockchain/core/UTXO/UTXO";
import { Array, Effect, Schema } from "effect";
import { Activity, Workflow } from "effect/unstable/workflow";
import { Block } from "../../domain/Block.js";
import { Blockchain } from "../../domain/Blockchain.js";
import {
  BlockchainPersistenceError,
  BlockchainRepository
} from "../../domain/BlockchainRepository.js";
import { UTXOPersistenceError, UTXOSet } from "../../domain/UTXOSet.js";

export const ApplyBlockWorkflow = Workflow.make({
  name: "ApplyBlockWorkflow",
  payload: {
    block: Block,
    consumedUtxos: Schema.Array(UTXO),
    mempoolToRestore: Schema.Array(Transaction)
  },
  success: Block,
  error: Schema.Union([BlockchainPersistenceError, UTXOPersistenceError]),
  idempotencyKey: ({ block }) => block.hash
});

const updateUTXOSet = (transactions: ReadonlyArray<Transaction>) =>
  Effect.gen(function* () {
    const { add, remove } = yield* UTXOSet;

    const consumedUtxos = Array.flatMap(transactions, (tx) =>
      Array.filter(tx.inputs, (input) => input.txOutputId !== "")
    );

    yield* remove(consumedUtxos);

    const newUtxos = Array.flatMap(transactions, (tx) =>
      Array.map(tx.outputs, (output, index) => ({
        txOutputId: tx.id,
        txOutputIndex: TxOutputIndex.make(index),
        address: output.address,
        amount: output.amount
      }))
    );

    yield* add(newUtxos);
  });

export const ApplyBlockWorkflowLayer = ApplyBlockWorkflow.toLayer(
  Effect.fn(function* ({ block, consumedUtxos, mempoolToRestore }) {
    const { addBlock, removeLastBlock, clearMinedTransactions, restoreMempool } =
      yield* BlockchainRepository;

    const utxoSet = yield* UTXOSet;
    const transactions = block.transactions;

    yield* Activity.make({
      name: "AddBlock",
      success: Blockchain,
      error: BlockchainPersistenceError,
      execute: addBlock(block)
    }).pipe(
      ApplyBlockWorkflow.withCompensation(
        Effect.fn(function* () {
          yield* Effect.logWarning(`Compensating: removing block ${block.hash}`);
          yield* removeLastBlock(block.hash).pipe(Effect.eventually);
        })
      )
    );

    yield* Activity.make({
      name: "UpdateUTXOSet",
      success: Schema.Void,
      error: UTXOPersistenceError,
      execute: updateUTXOSet(transactions)
    }).pipe(
      ApplyBlockWorkflow.withCompensation(
        Effect.fn(function* () {
          yield* Effect.logWarning(`Compensating: reversing UTXO changes`);
          yield* utxoSet.reverseTransactions(transactions, consumedUtxos).pipe(Effect.eventually);
        })
      )
    );

    yield* Activity.make({
      name: "ClearMempool",
      success: Blockchain,
      error: BlockchainPersistenceError,
      execute: clearMinedTransactions(Array.map(transactions, (tx) => tx.id))
    }).pipe(
      ApplyBlockWorkflow.withCompensation(
        Effect.fn(function* () {
          yield* Effect.logWarning(`Compensating: restoring mempool`);
          yield* restoreMempool(mempoolToRestore).pipe(Effect.eventually);
        })
      )
    );

    yield* Effect.logInfo(`Applied block: height=${block.height}, hash=${block.hash}`);

    return block;
  })
);
