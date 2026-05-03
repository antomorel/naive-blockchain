import type { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Array, Effect, Option, Schema } from "effect";
import { BlockchainRepository } from "../../domain/BlockchainRepository.js";

const isCoinbase = (tx: Transaction): boolean =>
  tx.inputs.length === 1 && tx.inputs[0].txOutputId === "";

const getFrom = (tx: Transaction) =>
  Effect.gen(function* () {
    if (isCoinbase(tx)) return "coinbase";

    return yield* Array.head(tx.inputs).pipe(
      Option.match({
        onNone: () => Effect.succeed("unknown"),
        onSome: (firstInput) =>
          Schema.encodeEffect(Schema.Uint8ArrayFromBase64)(firstInput.publicKey)
      })
    );
  });

const getTo = (tx: Transaction) => {
  const firstOutput = tx.outputs[0];
  if (!firstOutput) return "unknown";
  return firstOutput.address;
};

const getTotalAmount = (tx: Transaction): number =>
  Array.reduce(tx.outputs, 0, (sum, output) => sum + output.amount);

export const getTransactions = Effect.fn("getTransactions")(function* ({
  skip,
  take
}: {
  skip: number;
  take: number;
}) {
  const transactions = yield* BlockchainRepository.use(({ getTransactions }) =>
    getTransactions({ skip, take })
  );

  return yield* Effect.forEach(
    transactions,
    ({ transaction, blockTimestamp }) =>
      Effect.gen(function* () {
        const from = yield* getFrom(transaction);

        return {
          hash: transaction.id,
          from,
          to: getTo(transaction),
          amount: getTotalAmount(transaction),
          time: blockTimestamp
        };
      }),
    { concurrency: "unbounded" }
  );
});
