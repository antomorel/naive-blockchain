import type { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Boolean, Data, Effect, pipe } from "effect";
import { BlockchainRepository } from "../../domain/BlockchainRepository";
import * as TransactionService from "../../infrastructure/TransactionService";

export class InvalidTransactionInputsError extends Data.TaggedError(
  "InvalidTransactionInputsError"
)<{}> {}

export class InvalidTransactionOutputsError extends Data.TaggedError(
  "InvalidTransactionOutputsError"
)<{}> {}

export const sendTransaction = Effect.fn("sendTransaction")(function* (transaction: Transaction) {
  const areTxInputValid = yield* pipe(
    transaction.inputs,
    Effect.forEach((txIn) => TransactionService.isTxInputValid(txIn, transaction.id)),
    Effect.map(Boolean.ReducerAnd.combineAll)
  );

  if (!areTxInputValid) {
    return yield* new InvalidTransactionInputsError();
  }

  const areTxOutValid = yield* TransactionService.areTxOutputsValid(transaction);

  if (!areTxOutValid) {
    return yield* new InvalidTransactionOutputsError();
  }

  yield* BlockchainRepository.use(({ addTransactionToPool }) => addTransactionToPool(transaction));
});
