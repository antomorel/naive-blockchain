import { Amount } from "@blockchain/core/primitives/Amount";
import { Duration } from "effect";

export const BLOCK_GENERATION_INTERVAL = Duration.seconds(10);

// in blocks
export const DIFFICULTY_ADJUSTMENT_INTERVAL = 1024;

export const COINBASE_AMOUNT = Amount.make(50);
