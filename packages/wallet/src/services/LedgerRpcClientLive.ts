import { LedgerRpcs } from "@blockchain/ledger-api/rpc/ledgerRpc";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import { LedgerRpcClient } from "../domain/Ledger/LedgerRpcClient";

const ProtocolLive = RpcClient.layerProtocolHttp({
  url: "/rpc"
}).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]));

export const LedgerRpcClientLive = RpcClient.make(LedgerRpcs).pipe(
  Layer.effect(LedgerRpcClient),
  Layer.provide(ProtocolLive)
);
