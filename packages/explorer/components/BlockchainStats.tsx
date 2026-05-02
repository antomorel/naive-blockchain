"use client";

import { Duration } from "effect";
import { cn, formatHashrate } from "@/lib/utils";
import { useBlockchainStats } from "@/hooks/useBlockchainStats";

interface StatCardProps {
  label: string;
  value: string;
}

const StatCard = ({ label, value }: StatCardProps) => (
  <div
    className={cn(
      "rounded-lg border border-border bg-card",
      "p-5 shadow-sm",
      "transition-shadow hover:shadow-md"
    )}
  >
    <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
    <p className="text-2xl font-semibold text-card-foreground font-mono tracking-tight">
      {value}
    </p>
  </div>
);

export const BlockchainStats = () => {
  const { data } = useBlockchainStats();
  const stats = data.value;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard label="Network Hashrate" value={formatHashrate(stats.hashrate)} />
      <StatCard
        label="24h Transactions"
        value={stats.transactionsInThePast24Hours.toLocaleString()}
      />
      <StatCard
        label="Avg Block Time"
        value={Duration.format(stats.avgBlockTime)}
      />
    </div>
  );
};
