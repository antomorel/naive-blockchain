"use client";

import { blockchainStatsAtom } from "@/lib/atoms";
import { useAtomRefresh, useAtomSuspense } from "@effect/atom-react/Hooks";

export const useBlockchainStats = () => {
  const result = useAtomSuspense(blockchainStatsAtom);
  const refresh = useAtomRefresh(blockchainStatsAtom);

  return { data: result, refresh };
};
