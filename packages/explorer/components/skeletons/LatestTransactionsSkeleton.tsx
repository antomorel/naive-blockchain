import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export const LatestTransactionsSkeleton = () => (
  <div className="rounded-lg border border-border bg-card shadow-sm">
    <div className="flex items-center justify-between p-4 border-b border-border">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-20" />
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
        {Array.from({ length: 8 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-16 ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-20 ml-auto" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
