import { LedgerRpcClient } from "@blockchain/ledger-api/rpc/client"
import { Address } from "@blockchain/core/primitives/Address"
import { Amount } from "@blockchain/core/primitives/Amount"
import type { UTXO } from "@blockchain/core/UTXO/UTXO"
import { Data, Effect, Option } from "effect"

class InsufficientFundsError extends Data.TaggedError("InsufficientFundsError")<{
  address: Address
  targetAmount: Amount
}> {}

const branchAndBoundCoinSelection = (
  utxos: ReadonlyArray<UTXO>,
  target: Amount,
  index = 0,
  currentSelection: UTXO[] = []
): Option.Option<ReadonlyArray<UTXO>> => {
  const currentSum = currentSelection.reduce((acc, u) => acc + u.amount, 0)

  if (currentSum === target) return Option.some(currentSelection)

  if (currentSum > target || index >= utxos.length) {
    return Option.none()
  }

  const withCurrent = branchAndBoundCoinSelection(utxos, target, index + 1, [
    ...currentSelection,
    utxos[index]
  ])

  if (withCurrent) return withCurrent

  return branchAndBoundCoinSelection(utxos, target, index + 1, currentSelection)
}

const accumulatorCoinSelection = (
  utxos: ReadonlyArray<UTXO>,
  targetAmount: Amount,
  address: Address
) =>
  Effect.gen(function* () {
    let accumulatedAmount = 0
    const selectedUtxos: UTXO[] = []

    for (const utxo of utxos) {
      selectedUtxos.push(utxo)
      accumulatedAmount += utxo.amount

      if (accumulatedAmount >= targetAmount) {
        return {
          selection: selectedUtxos,
          leftOver: Amount.make(accumulatedAmount - targetAmount)
        }
      }
    }

    return yield* new InsufficientFundsError({ address, targetAmount })
  })

export const findForAmountAndAddress = Effect.fn("findUTXOsForAmountAndAddress")(function* (
  targetAmount: Amount,
  address: Address
) {
  const client = yield* LedgerRpcClient
  const utxosOfAddress = yield* client.findAllByAddressOrderedByAmountDesc({ address })

  const selection = branchAndBoundCoinSelection(utxosOfAddress, targetAmount)

  return yield* Option.match(selection, {
    onSome: (selection) => Effect.succeed({ selection, leftOver: Amount.make(0) }),
    onNone: () => accumulatorCoinSelection(utxosOfAddress, targetAmount, address)
  })
})
