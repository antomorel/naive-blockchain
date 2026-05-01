import { Array, Effect, pipe, String } from "effect"
import * as HashService from "../crypto/HashService"
import { TransactionId } from "../primitives/TransactionId"
import type { TransactionOutput, UnsignedTransactionInput } from "./Transaction"

export const makeTransactionId = Effect.fn("makeTransactionId")(function* (
  inputs: ReadonlyArray<UnsignedTransactionInput>,
  outputs: ReadonlyArray<TransactionOutput>
) {
  const txInContent = pipe(
    inputs,
    Array.flatMap((txIn) => [txIn.txOutputId, txIn.txOutputIndex.toString()]),
    Array.reduce(String.empty, String.concat)
  )

  const txOutContent = pipe(
    outputs,
    Array.flatMap((txOut) => [txOut.address, txOut.amount.toString()]),
    Array.reduce(String.empty, String.concat)
  )

  const hash = yield* HashService.sha256String(String.concat(txInContent, txOutContent))

  return TransactionId.make(hash)
})
