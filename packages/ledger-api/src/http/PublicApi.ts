import { HttpApi } from "effect/unstable/httpapi";
import { BlockchainApi } from "./BlockchainApi";
import { BlocksApi } from "./BlocksApi";
import { TransactionsApi } from "./TransactionsApi";

export const PublicApi = HttpApi.make("PublicApi")
  .addHttpApi(BlocksApi)
  .addHttpApi(TransactionsApi)
  .addHttpApi(BlockchainApi)
  .prefix("/api");
