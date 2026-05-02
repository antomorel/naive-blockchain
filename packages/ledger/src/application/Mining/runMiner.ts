import { Effect, Option } from "effect";
import { LedgerConfig } from "../../config";
import { mineNextBlock } from "./mineNextBlock";

export const runMiner = Effect.fn("runMiner")(function* () {
  const { minerAddress } = yield* LedgerConfig;

  if (Option.isNone(minerAddress)) {
    return yield* Effect.logInfo("No miner address found, skipping miner...");
  }

  yield* Effect.logInfo("Starting miner...");
  yield* Effect.forever(mineNextBlock(minerAddress.value));
});
