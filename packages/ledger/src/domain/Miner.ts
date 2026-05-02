import type { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Context, type Effect } from "effect";
import type { Block } from "./Block";

export interface MinerService {
  readonly mineNext: (
    previousBlock: Block,
    transactions: readonly Transaction[]
  ) => Effect.Effect<Block, never, never>;
}

export const MinerService = Context.Service<MinerService>("@blockchain/ledger/MinerService");
