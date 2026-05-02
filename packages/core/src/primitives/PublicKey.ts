import { Schema } from "effect";

export const PublicKey = Schema.Uint8ArrayFromBase64.pipe(Schema.brand("PublicKey"));
export type PublicKey = typeof PublicKey.Type;
