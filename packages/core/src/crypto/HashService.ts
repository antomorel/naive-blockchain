import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { Array, Effect, Equal, pipe } from "effect";
import { Difficulty } from "../primitives/Difficulty.js";

export const sha256Hash = (data: Uint8Array) => Effect.sync(() => bytesToHex(sha256(data)));

export const sha256String = (data: string) => sha256Hash(new TextEncoder().encode(data));

export const hashMatchesDifficulty = (hash: string, difficulty: Difficulty) =>
  pipe(hash, hexToBytes, Array.take(difficulty), Array.every(Equal.equals(0)));
