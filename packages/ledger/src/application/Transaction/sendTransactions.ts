import type { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Boolean, Data, Effect, Option, pipe, Record } from "effect";
import { BlockchainRepository } from "../../domain/BlockchainRepository";
import * as TransactionService from "../../infrastructure/TransactionService";

export class InvalidTransactionInputsError extends Data.TaggedError(
  "InvalidTransactionInputsError"
)<{}> {}

export class InvalidTransactionOutputsError extends Data.TaggedError(
  "InvalidTransactionOutputsError"
)<{}> {}

export const sendTransaction = Effect.fn("sendTransaction")(function* (transaction: Transaction) {
  const blockchain = yield* BlockchainRepository.use(({ getBlockchain }) => getBlockchain());

  const previousBlock = Record.get(blockchain.blocks, blockchain.latestBlockHash);

  if (Option.isNone(previousBlock)) {
    return yield* Effect.die("No previous block found");
  }

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

  // Add transaction to the pool
});
