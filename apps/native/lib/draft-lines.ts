import type { Line } from "@betterbill/core";

// Lines checked on the reading screen wait here for the care screen, which
// sends them (with what the patient did not receive) in one confirmLines.
const drafts = new Map<string, Line[]>();

export function holdLines(caseId: string, lines: Line[]) {
  drafts.set(caseId, lines);
}

export function heldLines(caseId: string): Line[] | null {
  return drafts.get(caseId) ?? null;
}
