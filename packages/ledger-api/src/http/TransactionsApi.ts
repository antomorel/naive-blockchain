import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { InternalServerError } from "../errors/apiErrors";

class TransactionsApiGroup extends HttpApiGroup.make("transactions").add(
  HttpApiEndpoint.make("GET")("getTransactions", "/", {
    payload: {
      skip: Schema.Number,
      take: Schema.Number
    },
    success: Schema.Array(
      Schema.Struct({
        hash: Schema.String,
        from: Schema.String,
        to: Schema.String,
        amount: Schema.Number,
        time: Schema.Duration
      })
    ),
    error: InternalServerError
  })
) {}

export class TransactionsApi extends HttpApi.make("TransactionsApi")
  .add(TransactionsApiGroup)
  .prefix("/transactions") {}
