"use client";

import { Duration } from "effect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { truncateAddress } from "@/lib/utils";
import { useTransactions } from "@/hooks/useTransactions";

export const LatestTransactions = () => {
  const { data } = useTransactions({ skip: 0, take: 8 });
  const transactions = data.value;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-card-foreground">Latest Transactions</h2>
        <a
          href="/transactions"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          View All →
        </a>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hash</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.hash}>
              <TableCell className="font-mono font-medium text-primary">
                <a href={`/tx/${tx.hash}`} className="hover:underline">
                  {truncateAddress(tx.hash, 10, 6)}
                </a>
              </TableCell>
              <TableCell className="font-mono text-muted-foreground">
                <a
                  href={`/address/${tx.from}`}
                  className="hover:text-foreground transition-colors"
                  title={tx.from}
                >
                  {truncateAddress(tx.from)}
                </a>
              </TableCell>
              <TableCell className="font-mono text-muted-foreground">
                <a
                  href={`/address/${tx.to}`}
                  className="hover:text-foreground transition-colors"
                  title={tx.to}
                >
                  {truncateAddress(tx.to)}
                </a>
              </TableCell>
              <TableCell className="text-right font-mono text-primary">
                {tx.amount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {Duration.format(tx.time)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
