"use client";

import { transactionsAtom } from "@/lib/atoms";
import { useAtomRefresh, useAtomSuspense } from "@effect/atom-react/Hooks";
import { useMemo } from "react";

export const useTransactions = (params: { skip: number; take: number }) => {
  const atom = useMemo(() => transactionsAtom(params), [params]);
  const result = useAtomSuspense(atom);
  const refresh = useAtomRefresh(atom);

  return { data: result, refresh };
};
