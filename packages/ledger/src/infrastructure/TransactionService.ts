import { Amount } from "@blockchain/core/primitives/Amount";
import type { BlockHeight } from "@blockchain/core/primitives/BlockHeight";
import { isSingletonArray } from "@blockchain/core/primitives/isSingletonArray";
import type { TransactionId } from "@blockchain/core/primitives/TransactionId";
import { makeTransactionId } from "@blockchain/core/Transaction/makeTransactionId";
import type { Transaction, TransactionInput } from "@blockchain/core/Transaction/Transaction";
import { Array, Effect, Equal, Option } from "effect";
import { COINBASE_AMOUNT } from "../domain/constants.js";
import { UTXOSet } from "../domain/UTXOSet.js";
import * as LedgerKeyPairService from "./crypto/LedgerKeyPairService.js";
import * as LedgerSignatureService from "./crypto/LedgerSignatureService.js";

export const isTxInputValid = Effect.fn("isTxInputValid")(function* (
  txIn: TransactionInput,
  transactionId: TransactionId
) {
  const utxo = yield* UTXOSet.use(({ find }) => find(txIn.txOutputId, txIn.txOutputIndex)).pipe(
    Effect.map(Option.some),
    Effect.catchTag("UTXONotFoundError", () => Effect.succeedNone)
  );

  if (Option.isNone(utxo)) {
    return false;
  }

  const derivedAddress = yield* LedgerKeyPairService.deriveAddress(txIn.publicKey);

  if (derivedAddress !== utxo.value.address) {
    return false;
  }

  return yield* LedgerSignatureService.verifyString(transactionId, txIn.signature, txIn.publicKey);
});

export const areTxOutputsValid = Effect.fn("areTxOutputsValid")(function* (
  transaction: Transaction
) {
  const { getInputsTotalValue } = yield* UTXOSet;

  const totalTxInValues = yield* getInputsTotalValue(transaction.inputs);

  const totalTxOutValues = Array.reduce(transaction.outputs, Amount.make(0), (acc, txOut) =>
    Amount.make(acc + txOut.amount)
  );

  if (totalTxOutValues !== totalTxInValues) {
    return false;
  }

  return true;
});

export const isCoinbaseTxValid = Effect.fn("isCoinbaseTxValid")(function* (
  transaction: Transaction,
  blockHeight: BlockHeight
) {
  const expectedTransactionId = yield* makeTransactionId(transaction.inputs, transaction.outputs);
  if (expectedTransactionId !== transaction.id) {
    return false;
  }

  if (!isSingletonArray(transaction.inputs)) {
    return false;
  }

  if (!Equal.equals(transaction.inputs[0].txOutputIndex, blockHeight)) {
    return false;
  }

  if (!isSingletonArray(transaction.outputs)) {
    return false;
  }

  if (transaction.outputs[0].amount !== COINBASE_AMOUNT) {
    return false;
  }

  return true;
});
