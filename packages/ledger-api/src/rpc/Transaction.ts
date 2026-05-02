import { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { BadRequestError, InternalServerError } from "../errors/apiErrors";

const sendTransaction = Rpc.make("sendTransaction", {
  error: Schema.Union([InternalServerError, BadRequestError]),
  payload: {
    transaction: Transaction
  }
});

export const TransactionRpcs = RpcGroup.make(sendTransaction);
