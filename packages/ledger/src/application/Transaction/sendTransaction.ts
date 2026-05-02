import type { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Boolean, Effect, pipe, Schema } from "effect";
import { BlockchainRepository } from "../../domain/BlockchainRepository";
import * as TransactionService from "../../infrastructure/TransactionService";

export class InvalidTransactionInputsError extends Schema.TaggedErrorClass<InvalidTransactionInputsError>()(
  "InvalidTransactionInputsError",
  {}
) {}

export class InvalidTransactionOutputsError extends Schema.TaggedErrorClass<InvalidTransactionOutputsError>()(
  "InvalidTransactionOutputsError",
  {}
) {}

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
