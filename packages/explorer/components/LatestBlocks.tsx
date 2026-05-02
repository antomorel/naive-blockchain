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
import { truncateAddress, formatBytes } from "@/lib/utils";
import { useBlocks } from "@/hooks/useBlocks";

export const LatestBlocks = () => {
  const { data } = useBlocks({ skip: 0, take: 8 });
  const blocks = data.value;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-card-foreground">Latest Blocks</h2>
        <a href="/blocks" className="text-sm text-primary hover:text-primary/80 transition-colors">
          View All →
        </a>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Height</TableHead>
            <TableHead>Miner</TableHead>
            <TableHead className="text-right">Txs</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {blocks.map((block) => (
            <TableRow key={block.height}>
              <TableCell className="font-mono font-medium text-primary">
                <a href={`/block/${block.height}`} className="hover:underline">
                  {block.height.toLocaleString()}
                </a>
              </TableCell>
              <TableCell className="font-mono text-muted-foreground">
                <span title={block.miner}>{truncateAddress(block.miner)}</span>
              </TableCell>
              <TableCell className="text-right font-mono">
                {block.transactions.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {formatBytes(block.size)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {Duration.format(block.time)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
