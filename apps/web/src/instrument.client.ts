import * as Sentry from "@sentry/tanstackstart-react";

import { baseSentryOptions } from "./lib/sentry";

// No-op when VITE_SENTRY_DSN is unset.
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  Sentry.init({
    ...baseSentryOptions,
    dsn,
    environment:
      import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    // Browser to server tracing: send trace headers to this app's own origin.
    tracePropagationTargets: [/^\//, window.location.origin],
    integrations: [
      // Strictest privacy: bills are on screen. Text, inputs and media are
      // masked or blocked, and bill content is blocked by selector. Safe for
      // the synthetic demo data; see docs/SENTRY.md to turn it off.
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
        block: [
          "[data-sentry-block]",
          "[data-slot='table']",
          "[role='dialog']",
          "textarea",
        ],
      }),
      // Chromium only. Needs the Document-Policy: js-profiling header.
      Sentry.browserProfilingIntegration(),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    profileSessionSampleRate: 1.0,
    profileLifecycle: "trace",
  });
  Sentry.setTag("bb.flow", "unknown");
}
