import { BadRequestError, InternalServerError } from "@blockchain/ledger-api/errors/apiErrors";
import { TransactionRpcs } from "@blockchain/ledger-api/rpc/Transaction";
import { Effect } from "effect";
import { sendTransaction } from "../../application/Transaction/sendTransaction";

export const TransactionRpcHandlers = TransactionRpcs.toLayer({
  sendTransaction: ({ transaction }) =>
    sendTransaction(transaction).pipe(
      Effect.catchTags({
        UTXOPersistenceError: () =>
          Effect.fail(new InternalServerError({ message: "An unexpected error occurred" })),
        InvalidTransactionOutputsError: () =>
          Effect.fail(
            new BadRequestError({
              message: "Invalid transaction outputs",
              customErrorCode: "INVALID_TRANSACTION_OUTPUTS"
            })
          ),
        InvalidTransactionInputsError: () =>
          Effect.fail(
            new BadRequestError({
              message: "Invalid transaction inputs",
              customErrorCode: "INVALID_TRANSACTION_INPUTS"
            })
          )
      })
    )
});
