import { Address } from "@blockchain/core/primitives/Address";
import { PublicKey } from "@blockchain/core/primitives/PublicKey";
import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { Effect } from "effect";

ed.hashes.sha512 = sha512;

export const deriveAddress = (publicKey: PublicKey) =>
  Effect.sync(() => {
    const hash = sha256(publicKey);
    const addressBytes = hash.slice(0, 20);
    const address = "0x" + bytesToHex(addressBytes);
    return Address.make(address);
  });
