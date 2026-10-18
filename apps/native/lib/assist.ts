import type { Assistance, IncomeBand } from "@betterbill/core";

import type { Insurance } from "./my-info";

// The answers and the last result for a case, held in memory between the
// questions, the checklist and the result. Nothing here is saved.
export type AssistAnswers = {
  householdSize: number;
  annualIncomeCents: number;
  bandLabel: string;
  insurance?: Insurance;
  emergency?: boolean;
  highCosts?: boolean;
};

const answers = new Map<string, AssistAnswers>();
const results = new Map<string, Assistance>();

export const holdAnswers = (id: string, a: AssistAnswers) => answers.set(id, a);
export const heldAnswers = (id: string) => answers.get(id) ?? null;
export const holdResult = (id: string, r: Assistance) => results.set(id, r);
export const heldResult = (id: string) => results.get(id) ?? null;

const dollars = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString("en-US")}`;

export function bandLabel(b: IncomeBand): string {
  if (b.maxCents === null) return `Over ${dollars(b.minCents)}`;
  if (b.minCents === 0) return `Under ${dollars(b.maxCents)}`;
  return `${dollars(b.minCents)} to ${dollars(b.maxCents)}`;
}

// The range the profile's income falls in. Only the range leaves the phone.
export function bandIndexFor(bands: IncomeBand[], incomeCents: number) {
  return bands.findIndex(
    (b) =>
      incomeCents >= b.minCents &&
      (b.maxCents === null || incomeCents < b.maxCents),
  );
}

export const STATE_NAMES: Record<string, string> = {
  CA: "California",
  NY: "New York",
  WA: "Washington",
  MD: "Maryland",
};

export function insuranceOptions(state: string | null | undefined) {
  return [
    { value: "none" as const, label: "None" },
    { value: "medicare" as const, label: "Medicare" },
    {
      value: "medicaid" as const,
      label: state === "CA" ? "Medi-Cal" : "Medicaid",
    },
    { value: "private" as const, label: "Private plan" },
  ];
}

// The rule rows that can mean free or discounted care (not the side checks).
export const isHelpRule = (id: string) =>
  id === "policy" || id.startsWith("state:");
