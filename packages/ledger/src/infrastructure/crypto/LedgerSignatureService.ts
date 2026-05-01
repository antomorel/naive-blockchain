import type { PublicKey } from "@blockchain/core/primitives/PublicKey"
import type { Signature } from "@blockchain/core/primitives/Signature"
import * as ed from "@noble/ed25519"
import { sha512 } from "@noble/hashes/sha2.js"
import { Effect } from "effect"

ed.hashes.sha512 = sha512

export const verify = (
  message: Uint8Array,
  signature: Signature,
  publicKey: PublicKey
): Effect.Effect<boolean> => Effect.promise(() => ed.verifyAsync(signature, message, publicKey))

export const verifySync = (
  message: Uint8Array,
  signature: Signature,
  publicKey: PublicKey
): boolean => ed.verify(signature, message, publicKey)

export const verifyString = (
  message: string,
  signature: Signature,
  publicKey: PublicKey
): Effect.Effect<boolean> => verify(new TextEncoder().encode(message), signature, publicKey)
