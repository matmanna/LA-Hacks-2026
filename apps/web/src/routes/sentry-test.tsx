import { Button } from "@betterbill/ui/components/button";
import * as Sentry from "@sentry/tanstackstart-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { sentryServerTest, sentryTestEnabled } from "@/functions/sentry-test";

// Dev and demo only: trigger a test error, a slow span and a log so Sentry has
// real traces to show. Hidden in production unless SENTRY_TEST_ENABLED=true.
export const Route = createFileRoute("/sentry-test")({
  head: () => ({
    meta: [{ title: "Sentry test" }, { name: "robots", content: "noindex" }],
  }),
  loader: () => sentryTestEnabled(),
  component: SentryTest,
});

function SentryTest() {
  const enabled = Route.useLoaderData();
  const [status, setStatus] = useState("");

  if (!enabled) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16">
        <p>This page is off here.</p>
      </main>
    );
  }

  const run = async (label: string, fn: () => Promise<unknown> | void) => {
    setStatus(`${label}: running`);
    try {
      await fn();
      setStatus(`${label}: done`);
    } catch {
      setStatus(`${label}: error sent`);
    }
  };

  return (
    <main className="mx-auto max-w-xl space-y-4 px-5 py-10">
      <h1 className="font-semibold text-[28px] leading-[34px]">Sentry test</h1>
      <p className="text-muted-foreground text-sm">
        Each button sends one real event to Sentry. No bill data is involved.
      </p>
      <div className="flex flex-col gap-3">
        <Button
          onClick={() =>
            run("Client error", () => {
              Sentry.setTag("bb.flow", "sentry-test");
              Sentry.captureException(new Error("Sentry client test error"));
            })
          }
        >
          Send a client error
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            run("Server error", () =>
              sentryServerTest({ data: { kind: "error" } }),
            )
          }
        >
          Send a server error
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            run("Slow span", () => sentryServerTest({ data: { kind: "slow" } }))
          }
        >
          Run a slow span (1.5 s)
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            run("Log", async () => {
              Sentry.logger.info("sentry-test log", { source: "client" });
              await sentryServerTest({ data: { kind: "log" } });
            })
          }
        >
          Send a log
        </Button>
      </div>
      <p aria-live="polite" className="text-sm">
        {status}
      </p>
    </main>
  );
}
