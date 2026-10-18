import {
  checkLetterClaims,
  checkWording,
  type Flag,
  fallbackModelOutput,
  type Line,
  renderLetter,
  runAudit,
} from "@betterbill/core";
import { describe, expect, it, vi } from "vitest";

import { PRICES, SAMPLES, UNIT_BOUNDS } from "../data";
import {
  chooseLetterOutput,
  flagsForKind,
  type Generate,
} from "./letter-drafter";

const line: Line = {
  id: "l1",
  serviceDate: "2026-09-02",
  description: "CBC w/ differential",
  code: "85025",
  codeType: "CPT",
  units: 1,
  chargeCents: 8400,
  source: { page: 1, bbox: null },
  confidence: 0.95,
  userEdited: false,
};
const unrelated: Line = {
  ...line,
  id: "l9",
  description: "Room",
  code: "0110",
};
const flag: Flag = {
  id: "f1",
  lineIds: ["l1"],
  lever: "duplicate",
  tier: "confirmed",
  title: "Duplicate lab charge",
  explanation: "Listed twice on the same date.",
  amountCents: 8400,
  evidence: { kind: "arithmetic", detail: "Same code and date twice." },
  confidence: 0.99,
};
const good = fallbackModelOutput("letter", [flag], [line]);
const bad = {
  ...good,
  paragraphs: [{ flagId: "f1", text: "Please refund $999.00 for 85025." }],
};

function run(generate: Generate) {
  return chooseLetterOutput({
    kind: "letter",
    hospital: "Example Hospital",
    flags: [flag],
    lines: [line, unrelated],
    generate,
  });
}

describe("chooseLetterOutput", () => {
  it("uses the model's letter when it passes the claim check", async () => {
    const generate = vi.fn<Generate>().mockResolvedValue(good);
    const res = await run(generate);
    expect(res.usedFallback).toBe(false);
    expect(res.claims.map((c) => c.flagId)).toEqual(["f1"]);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("retries once with the problems, then accepts a fixed letter", async () => {
    const generate = vi
      .fn<Generate>()
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce(good);
    const res = await run(generate);
    expect(res.usedFallback).toBe(false);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.[0].input).toContain("Fix these problems");
    // The retry gets what is left of the shared 14 s budget.
    const retryTimeout = generate.mock.calls[1]?.[0].timeoutMs ?? 0;
    expect(retryTimeout).toBeGreaterThan(9_000);
    expect(retryTimeout).toBeLessThanOrEqual(14_000);
  });

  it("falls back after two letters that fail the check", async () => {
    const generate = vi.fn<Generate>().mockResolvedValue(bad);
    const res = await run(generate);
    expect(res.usedFallback).toBe(true);
    expect(res.out).toEqual(good);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("retries when the output does not match the schema", async () => {
    const generate = vi.fn<Generate>().mockResolvedValue({ subject: 1 });
    const res = await run(generate);
    expect(res.usedFallback).toBe(true);
    expect(generate.mock.calls[1]?.[0].input).toContain("matches the schema");
  });

  it("retries a failed call once with the same prompt, then falls back", async () => {
    const generate = vi.fn<Generate>().mockRejectedValue(new Error("503"));
    const res = await run(generate);
    expect(res.usedFallback).toBe(true);
    expect(res.claims).toHaveLength(1);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.[0].input).not.toContain("Fix these");
  });

  it("uses the model's letter when the retry after an error succeeds", async () => {
    const generate = vi
      .fn<Generate>()
      .mockRejectedValueOnce(new Error("503"))
      .mockResolvedValueOnce(good);
    const res = await run(generate);
    expect(res.usedFallback).toBe(false);
  });

  it("skips the retry when the time budget is spent", async () => {
    vi.useFakeTimers();
    try {
      const generate = vi.fn<Generate>().mockImplementation(async () => {
        vi.setSystemTime(Date.now() + 13_500);
        throw new Error("timeout");
      });
      const res = await run(generate);
      expect(res.usedFallback).toBe(true);
      expect(generate).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("sends the model only the lines the flags reference", async () => {
    const generate = vi.fn<Generate>().mockResolvedValue(good);
    await run(generate);
    const sent = JSON.parse(generate.mock.calls[0]?.[0].input ?? "{}");
    expect(sent.lines.map((l: Line) => l.id)).toEqual(["l1"]);
    expect(Object.keys(sent.lines[0]).sort()).toEqual([
      "chargeCents",
      "code",
      "description",
      "id",
      "serviceDate",
      "units",
    ]);
  });
});

describe("flagsForKind", () => {
  it("keeps only missing_itemization flags for an itemized-bill request", () => {
    const missing: Flag = { ...flag, id: "f2", lever: "missing_itemization" };
    expect(flagsForKind("itemized_request", [flag, missing])).toEqual([
      missing,
    ]);
    expect(flagsForKind("letter", [flag, missing])).toEqual([flag, missing]);
  });
});

// The fallback is what goes out when Gemini is down, so it must pass the same
// checks on every real sample bill, not just on hand-written fixtures.
describe("fallback letter on every sample bill", () => {
  it.each(SAMPLES.map((s) => [s.id, s] as const))("%s", (_id, sample) => {
    const { flags } = runAudit({
      bill: sample.bill,
      eob: sample.eob,
      unitBounds: UNIT_BOUNDS,
      prices: PRICES,
    });
    const out = fallbackModelOutput("letter", flags, sample.bill.lines);
    const check = checkLetterClaims(out, flags, sample.bill.lines);
    expect(check.problems).toEqual([]);
    const draft = renderLetter({
      kind: "letter",
      bill: sample.bill,
      flags,
      out,
      patientName: "The account holder",
      today: "2026-10-17",
    });
    expect(checkWording(draft)).toEqual([]);
  });
});
