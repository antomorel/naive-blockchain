"use client";

import { blocksAtom } from "@/lib/atoms";
import { useAtomRefresh, useAtomSuspense } from "@effect/atom-react/Hooks";
import { useMemo } from "react";

export const useBlocks = (params: { skip: number; take: number }) => {
  const atom = useMemo(() => blocksAtom(params), [params]);
  const result = useAtomSuspense(atom);
  const refresh = useAtomRefresh(atom);

  return { data: result, refresh };
};
