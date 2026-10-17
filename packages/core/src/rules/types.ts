import type { Bill, Eob, Flag, Lever, Savings } from "../schemas";

export type UnitBound = {
  code: string;
  maxUnitsPerDay: number;
  source: string;
  sourceUrl?: string;
};

export type PublishedPrice = {
  hospitalName: string;
  code: string;
  cashCents: number | null;
  minNegotiatedCents: number | null;
  maxNegotiatedCents: number | null;
  sourceUrl: string;
  capturedAt: string;
};

export type AuditInput = {
  bill: Bill;
  eob: Eob | null;
  unitBounds: UnitBound[];
  prices: PublishedPrice[];
  enabledLevers?: Lever[];
};

export type AuditOutput = { flags: Flag[]; savings: Savings };
