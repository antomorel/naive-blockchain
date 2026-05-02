import { TxOutputIndex } from "@blockchain/core/primitives/TxOutputIndex";
import { Transaction } from "@blockchain/core/Transaction/Transaction";
import { UTXO } from "@blockchain/core/UTXO/UTXO";
import { Array, Effect, Schema } from "effect";
import { Activity, Workflow } from "effect/unstable/workflow";
import { Block } from "../../domain/Block.js";
import {
  BlockchainPersistenceError,
  BlockchainRepository
} from "../../domain/BlockchainRepository.js";
import { UTXOPersistenceError, UTXOSet } from "../../domain/UTXOSet.js";

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

export const UpdateBlockchainAfterMinedBlockWorkflow = Workflow.make({
  name: "UpdateBlockchainAfterMinedBlockWorkflow",
  payload: {
    minedBlock: Block,
    consumedUtxos: Schema.Array(UTXO),
    mempool: Schema.Array(Transaction),
    allTransactions: Schema.Array(Transaction)
  },
  success: Block,
  error: Schema.Union([BlockchainPersistenceError, UTXOPersistenceError]),
  idempotencyKey: ({ minedBlock }) => minedBlock.hash
});

export const MineBlockWorkflowLayer = UpdateBlockchainAfterMinedBlockWorkflow.toLayer(
  Effect.fn(function* ({ minedBlock, allTransactions, consumedUtxos, mempool }) {
    const { addBlock, removeLastBlock, clearMinedTransactions, restoreMempool } =
      yield* BlockchainRepository;

    const utxoSet = yield* UTXOSet;

    yield* Activity.make({
      name: "AddBlock",
      success: Schema.Void,
      error: BlockchainPersistenceError,
      execute: addBlock(minedBlock)
    }).pipe(
      UpdateBlockchainAfterMinedBlockWorkflow.withCompensation(
        Effect.fn(function* () {
          yield* Effect.logWarning(`Compensating: removing block ${minedBlock.hash}`);
          yield* removeLastBlock(minedBlock.hash).pipe(Effect.eventually);
        })
      )
    );

    yield* Activity.make({
      name: "UpdateUTXOSet",
      success: Schema.Void,
      error: UTXOPersistenceError,
      execute: updateUTXOSet(allTransactions)
    }).pipe(
      UpdateBlockchainAfterMinedBlockWorkflow.withCompensation(
        Effect.fn(function* () {
          yield* Effect.logWarning(`Compensating: reversing UTXO changes`);
          yield* utxoSet
            .reverseTransactions(allTransactions, consumedUtxos)
            .pipe(Effect.eventually);
        })
      )
    );

    yield* Activity.make({
      name: "ClearMempool",
      success: Schema.Void,
      error: BlockchainPersistenceError,
      execute: clearMinedTransactions(Array.map(mempool, (tx) => tx.id))
    }).pipe(
      UpdateBlockchainAfterMinedBlockWorkflow.withCompensation(
        Effect.fn(function* () {
          yield* Effect.logWarning(`Compensating: restoring mempool`);
          yield* restoreMempool(mempool).pipe(Effect.eventually);
        })
      )
    );

    yield* Effect.logInfo(`Mined block ${minedBlock.height} with hash ${minedBlock.hash}`);

    return minedBlock;
  })
);
