// A-11: the labelled fallback shown only when DEMO_CALL_FALLBACK=1 and the live
// call fails. It must be a real rehearsal call we placed, never written by
// hand: fill it with `bun packages/api/scripts/save-recorded-call.ts <actionId>`.
import type { CallOutcome } from "@betterbill/core";

export const RECORDED_CALL: CallOutcome | null = null;
