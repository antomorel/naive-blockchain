import type { LedgerRpcs } from "@blockchain/ledger-api/rpc/ledgerRpc";
import { Context } from "effect";
import type { RpcClient, RpcGroup } from "effect/unstable/rpc";

export const LedgerRpcClient = Context.Service<
  RpcClient.RpcClient<RpcGroup.Rpcs<typeof LedgerRpcs>>
>("@blockchain/ledger-api/LedgerRpcClient");
