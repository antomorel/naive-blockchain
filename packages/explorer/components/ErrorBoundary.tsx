"use client";

import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from "react-error-boundary";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div
    className={cn(
      "rounded-lg border border-destructive/50 bg-destructive/10",
      "p-6 text-center"
    )}
  >
    <p className="text-destructive font-medium mb-2">Failed to load data</p>
    <p className="text-sm text-muted-foreground mb-4">
      {error instanceof Error ? error.message : "An unexpected error occurred"}
    </p>
    <button
      onClick={resetErrorBoundary}
      className={cn(
        "px-4 py-2 rounded-md text-sm font-medium",
        "bg-primary text-primary-foreground",
        "hover:bg-primary/90 transition-colors"
      )}
    >
      Retry
    </button>
  </div>
);

export const ErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ReactErrorBoundary FallbackComponent={ErrorFallback}>{children}</ReactErrorBoundary>
);
