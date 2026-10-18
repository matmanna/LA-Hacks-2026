import { logger, setMeasurement, setTag, startSpan } from "@sentry/core";

// Sentry helpers for the hero path and model calls. Everything here is a no-op
// when Sentry is not initialised. Attributes are limited to ids, counts,
// durations, modes, model names and token counts. Never pass bill text, line
// descriptions, names, account refs, images, prompts or completions.
type Attr = string | number | boolean;
export type Attrs = Record<string, Attr | undefined>;

const clean = (attrs: Attrs): Record<string, Attr> =>
  Object.fromEntries(
    Object.entries(attrs).filter(([, v]) => v !== undefined),
  ) as Record<string, Attr>;

export type HeroStep =
  | "case"
  | "parse"
  | "audit"
  | "draft"
  | "approve"
  | "send";

// Structured log with non-PII attributes.
export function logStep(message: string, attrs: Attrs = {}) {
  logger.info(message, clean(attrs));
}

// Runs one hero-path step in its own span, tags the flow, and records the
// duration as a measurement (bb.<step>_ms) and an attribute. `attrs` can be
// extended from the result through `after`.
export async function heroStep<T>(
  step: HeroStep,
  attrs: Attrs,
  fn: () => Promise<T>,
  after?: (result: T) => Attrs,
): Promise<T> {
  setTag("bb.flow", step);
  const started = performance.now();
  return startSpan(
    {
      name: `bb.${step}`,
      op: `bb.${step}`,
      attributes: { "bb.step": step, ...clean(attrs) },
    },
    async (span) => {
      try {
        const result = await fn();
        const ms = Math.round(performance.now() - started);
        let extra: Record<string, Attr> = {};
        try {
          extra = after ? clean(after(result)) : {};
        } catch {
          // Telemetry must never break the request.
        }
        span.setAttributes({ ...extra, "bb.duration_ms": ms });
        setMeasurement(`bb.${step}_ms`, ms, "millisecond");
        logStep(`bb.${step}`, { ...clean(attrs), ...extra, durationMs: ms });
        return result;
      } catch (error) {
        const ms = Math.round(performance.now() - started);
        span.setAttribute("bb.duration_ms", ms);
        logger.warn(`bb.${step} failed`, {
          ...clean(attrs),
          durationMs: ms,
        });
        throw error;
      }
    },
  );
}
