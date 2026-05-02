import { Address } from "@blockchain/core/primitives/Address";
import { Amount } from "@blockchain/core/primitives/Amount";
import { TransactionOutput } from "@blockchain/core/Transaction/Transaction";
import { Console, Effect } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { PrivateKey } from "../../../domain/KeyPair/PrivateKey.js";
import { LedgerRpcClient } from "../../../domain/Ledger/LedgerRpcClient.js";
import * as WalletService from "../../../services/WalletService.js";

export const sendCommand = Command.make(
  "send",
  {
    to: Flag.string("to").pipe(
      Flag.withAlias("t"),
      Flag.withDescription("Recipient wallet address"),
      Flag.withSchema(Address)
    ),
    amount: Flag.float("amount").pipe(
      Flag.withAlias("a"),
      Flag.withDescription("Amount to send"),
      Flag.withSchema(Amount)
    ),
    privateKey: Flag.string("private-key").pipe(
      Flag.withAlias("k"),
      Flag.withDescription("Sender's private key (base64 encoded)"),
      Flag.withSchema(PrivateKey)
    )
  },
  ({ to, amount, privateKey }) =>
    Effect.gen(function* () {
      yield* Console.log(`Preparing transaction...`);
      yield* Console.log(`  To:     ${to}`);
      yield* Console.log(`  Amount: ${amount}`);

      const transactionOutput = TransactionOutput.make({
        address: to,
        amount
      });

      const transaction = yield* WalletService.buildTransaction(transactionOutput, privateKey);

      yield* Console.log("");
      yield* Console.log("Submitting transaction to ledger...");

      const client = yield* LedgerRpcClient;
      yield* client.sendTransaction({ transaction });

      yield* Console.log("");
      yield* Console.log("Transaction submitted successfully!");
      yield* Console.log(`Transaction ID: ${transaction.id}`);
    })
).pipe(Command.withDescription("Send a transaction to the ledger"));
