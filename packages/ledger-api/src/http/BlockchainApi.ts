import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

class BlockchainApiGroup extends HttpApiGroup.make("blockchain").add(
  HttpApiEndpoint.make("GET")("getStats", "/stats", {
    success: Schema.Struct({
      hashrate: Schema.Number,
      transactionsInThePast24Hours: Schema.Number,
      avgBlockTime: Schema.Duration
    })
  })
) {}

export class BlockchainApi extends HttpApi.make("BlockchainApi")
  .add(BlockchainApiGroup)
  .prefix("/blockchain") {}
