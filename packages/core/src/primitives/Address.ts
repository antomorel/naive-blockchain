import { Schema } from "effect"

export const Address = Schema.String.pipe(Schema.brand("Address"))
export type Address = typeof Address.Type
