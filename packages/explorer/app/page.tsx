import { Suspense } from "react";
import { BlockchainStats } from "@/components/BlockchainStats";
import { LatestBlocks } from "@/components/LatestBlocks";
import { LatestTransactions } from "@/components/LatestTransactions";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BlockchainStatsSkeleton } from "@/components/skeletons/BlockchainStatsSkeleton";
import { LatestBlocksSkeleton } from "@/components/skeletons/LatestBlocksSkeleton";
import { LatestTransactionsSkeleton } from "@/components/skeletons/LatestTransactionsSkeleton";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Network Overview</h1>
        <p className="text-muted-foreground">
          Lumen Chain · UTXO ledger · 9.7-min target block time
        </p>
      </header>

      <ErrorBoundary>
        <Suspense fallback={<BlockchainStatsSkeleton />}>
          <BlockchainStats />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={<LatestBlocksSkeleton />}>
          <LatestBlocks />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={<LatestTransactionsSkeleton />}>
          <LatestTransactions />
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}
