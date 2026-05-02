"use client";

import { RegistryProvider } from "@effect/atom-react/RegistryContext";
import type { ReactNode } from "react";

export const AtomProvider = ({ children }: { children: ReactNode }) => {
  return <RegistryProvider>{children}</RegistryProvider>;
};
