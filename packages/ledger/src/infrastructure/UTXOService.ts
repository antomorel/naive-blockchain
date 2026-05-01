import { TxOutputIndex } from "@blockchain/core/primitives/TxOutputIndex"
import type { Transaction } from "@blockchain/core/Transaction/Transaction"
import { Array, Effect } from "effect"
import { UTXOSet } from "../domain/UTXOSet"

export const updateAfterNewTransaction = Effect.fn("updateAfterNewTransaction")(function* (
  newTransactions: ReadonlyArray<Transaction>
) {
  const newUnspentTxOuts = Array.flatMap(newTransactions, (t) =>
    Array.map(t.outputs, (txOut, index) => ({
      txOutputId: t.id,
      txOutputIndex: TxOutputIndex.make(index),
      address: txOut.address,
      amount: txOut.amount
    }))
  )

  const consumedTxOuts = Array.flatMap(newTransactions, (t) =>
    Array.map(t.inputs, (txIn) => ({
      txOutputId: txIn.txOutputId,
      txOutputIndex: txIn.txOutputIndex
    }))
  )

  yield* UTXOSet.use(({ add, remove }) =>
    Effect.all(
      {
        add: add(newUnspentTxOuts),
        remove: remove(consumedTxOuts)
      },
      { concurrency: 2 }
    )
  )
})
