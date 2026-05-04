import type { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Array, Boolean, Effect, pipe, Stream } from "effect";
import { BlockchainRepository } from "../../domain/BlockchainRepository.js";
import { NetworkService } from "../../domain/network/NetworkService.js";
import * as TransactionService from "../../infrastructure/TransactionService.js";

const validateAndAddTransaction = (transaction: Transaction) =>
  Effect.gen(function* () {
    const blockchain = yield* BlockchainRepository.use(({ getBlockchain }) => getBlockchain());

    const isDuplicate = Array.some(blockchain.mempool, (tx) => tx.id === transaction.id);
    if (isDuplicate) {
      yield* Effect.logDebug(`Ignoring duplicate transaction: ${transaction.id}`);
      return;
    }

    const areTxInputsValid = yield* pipe(
      transaction.inputs,
      Effect.forEach((txIn) => TransactionService.isTxInputValid(txIn, transaction.id)),
      Effect.map(Boolean.ReducerAnd.combineAll)
    );

    if (!areTxInputsValid) {
      yield* Effect.logWarning(`Rejected transaction with invalid inputs: ${transaction.id}`);
      return;
    }

    const areTxOutputsValid = yield* TransactionService.areTxOutputsValid(transaction);

    if (!areTxOutputsValid) {
      yield* Effect.logWarning(`Rejected transaction with invalid outputs: ${transaction.id}`);
      return;
    }

    yield* BlockchainRepository.use(({ addTransactionToPool }) =>
      addTransactionToPool(transaction)
    );

    yield* Effect.logInfo(`Received and added transaction to mempool: ${transaction.id}`);
  });

export const listenForIncomingTransactions = () =>
  Effect.gen(function* () {
    const networkService = yield* NetworkService;

    yield* networkService.onTransactionReceived.pipe(
      Stream.runForEach((transaction) =>
        validateAndAddTransaction(transaction).pipe(
          Effect.catch((error) =>
            Effect.logError(
              `Error processing incoming transaction: ${JSON.stringify(error, null, 2)}`
            )
          )
        )
      )
    );
  });
