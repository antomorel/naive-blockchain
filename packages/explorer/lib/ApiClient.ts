import { PublicApi } from "@blockchain/ledger-api/http/PublicApi";
import { Context, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";

export type LedgerApiClient = HttpApiClient.ForApi<typeof PublicApi>;

export const LedgerApiClient = Context.Service<LedgerApiClient>(
  "@blockchain/explorer/LedgerApiClient"
);

export const LedgerApiClientLive = HttpApiClient.make(PublicApi, {
  baseUrl: "http://localhost:3001"
}).pipe(Layer.effect(LedgerApiClient), Layer.provide(FetchHttpClient.layer));
