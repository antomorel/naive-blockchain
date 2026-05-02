import * as Atom from "effect/unstable/reactivity/Atom";
import { LedgerApiClientLive } from "./ApiClient";

export const ledgerRuntime = Atom.runtime(LedgerApiClientLive);
