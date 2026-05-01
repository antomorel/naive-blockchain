import { Address } from "@blockchain/core/primitives/Address"
import { PublicKey } from "@blockchain/core/primitives/PublicKey"
import { Schema } from "effect"
import { PrivateKey } from "./PrivateKey.js"

export const KeyPair = Schema.Struct({
  privateKey: PrivateKey,
  publicKey: PublicKey,
  address: Address
})
export type KeyPair = typeof KeyPair.Type
