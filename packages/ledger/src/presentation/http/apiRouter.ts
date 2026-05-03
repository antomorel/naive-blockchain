import { InternalServerError } from "@blockchain/ledger-api/errors/apiErrors";
import { PublicApi } from "@blockchain/ledger-api/http/PublicApi";
import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { getBlockchainStats } from "../../application/Blockchain/getBlockchainStats";
import { getBlocks } from "../../application/Blocks/getBlocks";
import { getTransactions } from "../../application/Transaction/getTransactions";

const BlockApiRouter = HttpApiBuilder.group(PublicApi, "blocks", (handlers) =>
  handlers.handle("getAll", ({ payload }) => getBlocks(payload))
);

const BlockchainApiRouter = HttpApiBuilder.group(PublicApi, "blockchain", (handlers) =>
  handlers.handle("getStats", getBlockchainStats)
);

const TransactionApiRouter = HttpApiBuilder.group(PublicApi, "transactions", (handlers) =>
  handlers.handle("getAll", ({ payload }) =>
    getTransactions(payload).pipe(
      Effect.catchTag("SchemaError", () =>
        Effect.fail(new InternalServerError({ message: "An unexpected error occurred" }))
      )
    )
  )
);

export const ApiRouterLive = HttpApiBuilder.layer(PublicApi).pipe(
  Layer.provide(Layer.mergeAll(BlockApiRouter, BlockchainApiRouter, TransactionApiRouter))
);
