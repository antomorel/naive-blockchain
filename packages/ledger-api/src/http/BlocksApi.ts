import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

class BlocksApiGroup extends HttpApiGroup.make("blocks").add(
  HttpApiEndpoint.make("GET")("getAll", "/", {
    payload: {
      skip: Schema.Number,
      take: Schema.Number
    },
    success: Schema.Array(
      Schema.Struct({
        height: Schema.Number,
        miner: Schema.String,
        transactions: Schema.Number,
        size: Schema.Number,
        time: Schema.DateTimeUtc
      })
    )
  })
) {}

export class BlocksApi extends HttpApi.make("BlockApi").add(BlocksApiGroup).prefix("/blocks") {}
