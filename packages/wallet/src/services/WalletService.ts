import type { Address } from "@blockchain/core/primitives/Address"
import type { TransactionId } from "@blockchain/core/primitives/TransactionId"
import { makeTransactionId } from "@blockchain/core/Transaction/makeTransactionId"
import {
  Transaction,
  TransactionInput,
  TransactionOutput
} from "@blockchain/core/Transaction/Transaction"
import type { UTXO } from "@blockchain/core/UTXO/UTXO"
import { Array, Boolean, Data, Effect } from "effect"
import type { PrivateKey } from "../domain/KeyPair/PrivateKey"
import * as CoinSelectionService from "./CoinSelectionService.js"
import * as WalletKeyPairService from "./crypto/WalletKeyPairService.js"
import * as WalletSignatureService from "./crypto/WalletSignatureService.js"

class PrivateKeyNotMatchError extends Data.TaggedError("PrivateKeyNotMatchError")<{
  referencedAddress: Address
  derivedAddress: Address
}> {}

const signUtxo = Effect.fn("signUtxo")(function* (
  transactionId: TransactionId,
  utxo: UTXO,
  privateKey: PrivateKey
) {
  const { address: derivedAddress } = yield* WalletKeyPairService.keyPairFromPrivateKey(privateKey)

  if (utxo.address !== derivedAddress) {
    return yield* new PrivateKeyNotMatchError({
      referencedAddress: utxo.address,
      derivedAddress
    })
  }

  return yield* WalletSignatureService.signString(transactionId, privateKey)
})

export const sendTransaction = Effect.fn("send")(function* (
  transactionOutput: TransactionOutput,
  privateKey: PrivateKey
) {
  const { address: sourceAddress, publicKey } =
    yield* WalletKeyPairService.keyPairFromPrivateKey(privateKey)

  const { selection: selectedUtxos, leftOver } =
    yield* CoinSelectionService.findForAmountAndAddress(transactionOutput.amount, sourceAddress)

  const transactionOutputs = Boolean.match(leftOver === 0, {
    onTrue: () => Array.make(transactionOutput),
    onFalse: () => {
      const transactionOutputToSource = TransactionOutput.make({
        address: sourceAddress,
        amount: leftOver
      })

      return Array.make(transactionOutput, transactionOutputToSource)
    }
  })

  const transactionId = yield* makeTransactionId(selectedUtxos, transactionOutputs)

  const signedInputs = yield* Effect.forEach(
    selectedUtxos,
    (utxo) =>
      signUtxo(transactionId, utxo, privateKey).pipe(
        Effect.map((signature) =>
          TransactionInput.make({
            txOutputId: utxo.txOutputId,
            txOutputIndex: utxo.txOutputIndex,
            signature,
            publicKey
          })
        )
      ),
    { concurrency: "unbounded" }
  )

  return Transaction.make({
    id: transactionId,
    inputs: signedInputs,
    outputs: transactionOutputs
  })
})
