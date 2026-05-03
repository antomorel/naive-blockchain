import { BlockHash } from "@blockchain/core/primitives/BlockHash";
import { BlockHeight } from "@blockchain/core/primitives/BlockHeight";
import { Transaction } from "@blockchain/core/Transaction/Transaction";
import { Schema } from "effect";
import { BlockHeader } from "../../domain/BlockHeader.js";

export const BLOCK_EVENT_TYPE = "org.naive.block" as const;
export const TRANSACTION_EVENT_TYPE = "org.naive.transaction" as const;
export const SYNC_REQUEST_EVENT_TYPE = "org.naive.sync-request" as const;

export class MatrixBlockEventContent extends Schema.Class<MatrixBlockEventContent>(
  "MatrixBlockEventContent"
)({
  hash: BlockHash,
  height: BlockHeight,
  header: BlockHeader,
  transactions: Schema.Array(Transaction)
}) {}

export class MatrixTransactionEventContent extends Schema.Class<MatrixTransactionEventContent>(
  "MatrixTransactionEventContent"
)({
  transaction: Transaction
}) {}

export class MatrixSyncRequestContent extends Schema.Class<MatrixSyncRequestContent>(
  "MatrixSyncRequestContent"
)({
  fromHeight: BlockHeight,
  toHeight: BlockHeight
}) {}

export const MatrixEventContent = Schema.Union([
  MatrixBlockEventContent,
  MatrixTransactionEventContent,
  MatrixSyncRequestContent
]);
export type MatrixEventContentEncoded = typeof MatrixEventContent.Encoded;
