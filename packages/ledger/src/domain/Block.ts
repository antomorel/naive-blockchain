import { BlockHash } from "@blockchain/core/primitives/BlockHash";
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight";
import { Difficulty } from "@blockchain/core/primitives/Difficulty";
import { Nonce } from "@blockchain/core/primitives/Nonce";
import { make as makeTimestamp } from "@blockchain/core/primitives/Timestamp";
import { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Option, Schema } from "effect";
import { BlockHeader } from "./BlockHeader.js";

const MAY_1ST_2026_TIMESTAMP = 1777637924000;

export class Block extends Schema.Class<Block>("Block")({
  hash: BlockHash,
  height: BlockHeight,
  header: BlockHeader,
  transactions: Schema.Array(Transaction)
}) {}

export const GenesisBlock = new Block({
  hash: BlockHash.make("922a3d05ca62b1a63b39f7a5d4b90cdc649fef73242e75fd056c13dc3021b9a0"),
  height: BlockHeight.make(0),
  header: {
    previousHash: Option.none(),
    timestamp: makeTimestamp(MAY_1ST_2026_TIMESTAMP),
    difficulty: Difficulty.make(1),
    nonce: Nonce.make(0)
  },
  transactions: []
});
