import { Context, Layer } from "effect";
import type { RpcGroup } from "effect/unstable/rpc";
import { RpcClient } from "effect/unstable/rpc";
import type { RpcClientError } from "effect/unstable/rpc/RpcClientError";
import { UTXORpcs } from "./UTXO.js";

export class LedgerRpcClient extends Context.Service<
  LedgerRpcClient,
  RpcClient.RpcClient<RpcGroup.Rpcs<typeof UTXORpcs>, RpcClientError>
>()("@blockchain/ledger-api/LedgerRpcClient") {
  static readonly layer = RpcClient.make(UTXORpcs).pipe(Layer.effect(LedgerRpcClient));
}
