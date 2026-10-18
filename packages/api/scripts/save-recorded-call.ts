// A-11: copies a real, finished rehearsal call into packages/api/src/recorded-call.ts
// so it can be shown (labelled) if the live call fails at judging.
// Usage: DATABASE_URL=... bun packages/api/scripts/save-recorded-call.ts <actionId>
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { CallOutcomeSchema } from "@betterbill/core";
import { createDb } from "@betterbill/db";
import { action } from "@betterbill/db/schema/index";
import { eq } from "drizzle-orm";

const actionId = process.argv[2];
const url = process.env.DATABASE_URL;
if (!actionId || !url) {
  console.error(
    "Usage: DATABASE_URL=... bun packages/api/scripts/save-recorded-call.ts <actionId>",
  );
  process.exit(1);
}

const db = createDb({ DATABASE_URL: url });
const [row] = await db.select().from(action).where(eq(action.id, actionId));
await db.$client.end();

if (row?.kind !== "call" || !row.outcome) {
  console.error("That action is not a finished call.");
  process.exit(1);
}
const outcome = CallOutcomeSchema.parse(JSON.parse(row.outcome));
if (outcome.source !== "live" || outcome.status !== "done") {
  console.error("Only a finished live call can be saved as the fallback.");
  process.exit(1);
}

const recorded = {
  ...outcome,
  source: "recorded_fallback" as const,
  recordedAt: new Date().toISOString(),
};
const file = join(import.meta.dir, "..", "src", "recorded-call.ts");
writeFileSync(
  file,
  `// A-11: a real rehearsal call saved by packages/api/scripts/save-recorded-call.ts from action
// ${actionId}. Shown only when DEMO_CALL_FALLBACK=1 and the live call fails.
import type { CallOutcome } from "@betterbill/core";

export const RECORDED_CALL: CallOutcome | null = ${JSON.stringify(recorded, null, 2)};
`,
);
console.log(`Saved the recorded call to ${file}. Review it, then commit.`);
