import { ORPCError } from "@orpc/server";
import { captureException, startSpan } from "@sentry/core";

// Per-procedure Sentry span. Attributes are limited to ids, counts and
// durations. Never add bill text, line descriptions, names or request bodies.
function caseIdOf(input: unknown): string | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const id = (input as { caseId?: unknown }).caseId;
  return typeof id === "string" ? id : undefined;
}

function leverCounts(output: unknown): Record<string, number> {
  const flags = (output as { flags?: unknown } | null)?.flags;
  const counts: Record<string, number> = {};
  if (!Array.isArray(flags)) return counts;
  for (const flag of flags) {
    const lever = (flag as { lever?: unknown } | null)?.lever;
    if (typeof lever === "string") {
      counts[`bb.lever.${lever}`] = (counts[`bb.lever.${lever}`] ?? 0) + 1;
    }
  }
  return counts;
}

export type ObserveOptions<R extends { output: unknown }> = {
  path: readonly string[];
  next: () => PromiseLike<R> | R;
};

export async function observe<R extends { output: unknown }>(
  { path, next }: ObserveOptions<R>,
  input: unknown,
): Promise<R> {
  const procedure = path.join(".");
  const caseId = caseIdOf(input);
  const started = Date.now();
  return startSpan(
    {
      name: `orpc.${procedure}`,
      op: "rpc",
      attributes: {
        "bb.procedure": procedure,
        ...(caseId ? { "bb.case_id": caseId } : {}),
      },
    },
    async (span) => {
      try {
        const result = await next();
        span.setAttributes({
          ...leverCounts(result.output),
          "bb.duration_ms": Date.now() - started,
        });
        return result;
      } catch (error) {
        span.setAttribute("bb.duration_ms", Date.now() - started);
        // Expected client errors (4xx) are not issues.
        const expected = error instanceof ORPCError && error.status < 500;
        if (!expected) {
          captureException(error, {
            tags: { procedure },
            ...(caseId ? { extra: { caseId } } : {}),
          });
        }
        throw error;
      }
    },
  );
}
