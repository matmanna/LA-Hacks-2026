import * as Sentry from "@sentry/tanstackstart-react";
import { createServerFn } from "@tanstack/react-start";

// Dev and demo helper. Disabled in production unless SENTRY_TEST_ENABLED=true.
const enabled = () =>
  process.env.NODE_ENV !== "production" ||
  process.env.SENTRY_TEST_ENABLED === "true";

export const sentryTestEnabled = createServerFn({ method: "GET" }).handler(() =>
  enabled(),
);

export const sentryServerTest = createServerFn({ method: "POST" })
  .validator((d: { kind: "error" | "slow" | "log" }) => d)
  .handler(async ({ data }) => {
    if (!enabled()) throw new Error("Sentry test is disabled here.");
    Sentry.setTag("bb.flow", "sentry-test");
    if (data.kind === "log") {
      Sentry.logger.info("sentry-test log", { source: "server" });
      Sentry.logger.warn("sentry-test warning", { source: "server" });
      return { ok: true };
    }
    if (data.kind === "slow") {
      const started = Date.now();
      await Sentry.startSpan(
        { name: "sentry-test.slow", op: "bb.test" },
        async () => {
          await new Promise((r) => setTimeout(r, 1500));
        },
      );
      Sentry.setMeasurement("bb.test_ms", Date.now() - started, "millisecond");
      return { ok: true };
    }
    throw new Error("Sentry server test error (intentional)");
  });
