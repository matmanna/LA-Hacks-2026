import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@betterbill/ui/components/table";
import { cn } from "@betterbill/ui/lib/utils";
import { ChevronRight } from "lucide-react";

import { Money } from "./money";
import { TIER_LABELS, type Tier, TierBadge } from "./tier-badge";

type TableLine = {
  id: string;
  description: string;
  code: string | null;
  serviceDate: string | null;
  chargeCents: number;
};

type TableFlag = {
  id: string;
  title: string;
  tier: Tier;
  amountCents: number;
};

type BillTableProps = {
  rows: {
    line: TableLine;
    flag?: TableFlag;
    savingsCents?: number;
    savingsRange?: [number, number];
  }[];
  totalCents: number;
  onOpen: (flagId: string) => void;
  className?: string;
};

export function BillTable({
  rows,
  totalCents,
  onOpen,
  className,
}: BillTableProps) {
  return (
    <Table className={cn(className)}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead scope="col">Item</TableHead>
          <TableHead scope="col">Tier</TableHead>
          <TableHead scope="col" className="text-right">
            Amount
          </TableHead>
          <TableHead scope="col" className="text-right">
            Possible savings
          </TableHead>
          <TableHead scope="col" className="w-10">
            <span className="sr-only">Open evidence</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ line, flag, savingsCents, savingsRange }) => (
          <TableRow
            key={line.id}
            className={cn(
              "relative h-16",
              flag && "cursor-pointer hover:bg-muted/60",
            )}
          >
            <TableCell className="whitespace-normal">
              {flag ? (
                <button
                  type="button"
                  onClick={() => onOpen(flag.id)}
                  aria-label={`${flag.title}. ${TIER_LABELS[flag.tier]}. Show evidence`}
                  className="text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                >
                  <span className="block font-medium text-sm">
                    {line.description}
                  </span>
                </button>
              ) : (
                <span className="block font-medium text-sm">
                  {line.description}
                </span>
              )}
              <span className="block text-muted-foreground text-xs leading-4">
                {[line.code, line.serviceDate].filter(Boolean).join(" · ")}
              </span>
            </TableCell>
            <TableCell>
              {flag ? <TierBadge tier={flag.tier} /> : null}
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums">
              <Money cents={line.chargeCents} />
            </TableCell>
            <TableCell className="text-right font-semibold text-mint-ink text-sm">
              {savingsRange ? (
                <>
                  <Money cents={savingsRange[0]} sign="negative" /> to{" "}
                  <Money cents={savingsRange[1]} sign="negative" />
                </>
              ) : savingsCents !== undefined ? (
                <Money cents={savingsCents} sign="negative" />
              ) : (
                <span className="font-normal text-muted-foreground text-xs">
                  No issues found
                </span>
              )}
            </TableCell>
            <TableCell>
              {flag ? (
                <ChevronRight
                  className="size-5 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-medium text-sm">Total billed</TableCell>
          <TableCell />
          <TableCell className="text-right font-semibold text-sm tabular-nums">
            <Money cents={totalCents} />
          </TableCell>
          <TableCell />
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  );
}
