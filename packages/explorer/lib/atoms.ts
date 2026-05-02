import { ledgerRuntime } from "@/lib/atomRuntime";
import { Effect, Schedule, Stream } from "effect";
import { Atom } from "effect/unstable/reactivity";
import { LedgerApiClient } from "./ApiClient";

const retryPolicy = Schedule.exponential("100 millis").pipe(Schedule.both(Schedule.recurs(3)));
const pollingSchedule = Schedule.spaced("2 seconds");

export const blockchainStatsAtom = ledgerRuntime.atom(
  Stream.fromEffectRepeat(
    Effect.gen(function* () {
      const client = yield* LedgerApiClient;
      return yield* client.blockchain.getStats({}).pipe(Effect.retry(retryPolicy));
    })
  ).pipe(Stream.schedule(pollingSchedule))
);

export const blocksAtom = Atom.family((payload: { skip: number; take: number }) =>
  ledgerRuntime.atom(
    Stream.fromEffectRepeat(
      LedgerApiClient.use((client) =>
        client.blocks.getBlocks({ payload }).pipe(Effect.retry(retryPolicy))
      )
    ).pipe(Stream.schedule(pollingSchedule))
  )
);

export const transactionsAtom = Atom.family((payload: { skip: number; take: number }) =>
  ledgerRuntime.atom(
    Stream.fromEffectRepeat(
      LedgerApiClient.use((client) =>
        client.transactions.getTransactions({ payload }).pipe(Effect.retry(retryPolicy))
      )
    ).pipe(Stream.schedule(pollingSchedule))
  )
);
