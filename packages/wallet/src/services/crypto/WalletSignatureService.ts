import { Signature } from "@blockchain/core/primitives/Signature"
import * as ed from "@noble/ed25519"
import { sha512 } from "@noble/hashes/sha2.js"
import { Effect } from "effect"
import type { PrivateKey } from "../../domain/KeyPair/PrivateKey"

ed.hashes.sha512 = sha512

export const sign = (message: Uint8Array, privateKey: PrivateKey): Effect.Effect<Signature> =>
  Effect.promise(() => ed.signAsync(message, privateKey)).pipe(
    Effect.map((signature) => Signature.make(signature))
  )

export const signSync = (message: Uint8Array, privateKey: PrivateKey): Signature => {
  const signature = ed.sign(message, privateKey)
  return Signature.make(signature)
}

export const signString = (message: string, privateKey: PrivateKey): Effect.Effect<Signature> =>
  sign(new TextEncoder().encode(message), privateKey)
