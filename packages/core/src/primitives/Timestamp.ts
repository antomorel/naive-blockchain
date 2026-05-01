import { Schema } from "effect"

export const Timestamp = Schema.DateTimeUtcFromMillis
export type Timestamp = typeof Timestamp.Type
