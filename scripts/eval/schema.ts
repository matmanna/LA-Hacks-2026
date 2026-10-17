// Binding shape of data/eval/results.json (plan C section 8). Consumed by eval.results, the UI card and the pitch.
import { z } from "zod";

const rate = z.number().min(0).max(1).nullable();
const count = z.number().int().min(0);
const leverCount = z.object({ caught: count, expected: count });
const flagRef = z.object({
  fixture: z.string(),
  lever: z.string(),
  lineIds: z.array(z.string()),
  amountCents: z.number().int().nullable().optional(),
});

export const Results = z.object({
  schemaVersion: z.literal(1),
  runAt: z.string(),
  gitSha: z.string(),
  coreVersion: z.string(),
  datasets: z.object({
    synthetic: z.object({
      fixtures: count,
      cleanFixtures: count,
      expectedFlags: count,
      skippedRequiresCapture: count,
    }),
    photos: z.object({
      photos: count,
      conditions: z.array(z.string()),
      model: z.string().nullable(),
    }),
    botm: z.object({
      cases: count,
      reporterFindings: count,
      inScopeFindings: count,
    }),
  }),
  metrics: z.object({
    seededRecall: z.object({
      caught: count,
      expected: count,
      rate,
      byLever: z.record(z.string(), leverCount),
    }),
    seededRecallFromPhotos: z.object({ caught: count, expected: count, rate }),
    falseFlagsOnClean: z.object({
      count,
      cleanFixtures: count,
      items: z.array(flagRef),
    }),
    precision: z.object({ matched: count, produced: count, rate }),
    confirmedAmountExact: z.object({ exact: count, caughtConfirmed: count }),
    evidenceCompleteness: z.object({ complete: count, produced: count, rate }),
    auditTimeMs: z.object({
      p50: z.number().nullable(),
      p95: z.number().nullable(),
      runsPerFixture: count,
    }),
    photoToLinesSec: z.object({
      p50: z.number().nullable(),
      p95: z.number().nullable(),
      n: count,
    }),
    lineExtraction: z.object({
      recall: rate,
      precision: rate,
      exactLineRate: rate,
      totalsMatchRate: rate,
      byCondition: z.record(
        z.string(),
        z.object({ photos: count, recall: rate, precision: rate }),
      ),
      fieldAccuracy: z.object({
        code: rate,
        serviceDate: rate,
        units: rate,
        chargeCents: rate,
      }),
    }),
    botmRecall: z.object({
      inScope: z.object({ caught: count, total: count, rate }),
      all: z.object({ caught: count, total: count, rate }),
      extraFlags: count,
    }),
  }),
  misses: z.array(flagRef),
  extras: z.array(flagRef),
  notes: z.array(z.string()),
});
export type Results = z.infer<typeof Results>;
