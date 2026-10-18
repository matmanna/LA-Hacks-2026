import * as Sentry from "@sentry/tanstackstart-react";

import { baseSentryOptions } from "./lib/sentry";

// No-op when SENTRY_DSN is unset (CI, local dev, tests).
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    ...baseSentryOptions,
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    integrations: [
      // Forward only warnings and errors from console (evlog writes there) to
      // Sentry Logs. Info-level request logs stay in Vercel logs.
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    ],
  });
  Sentry.setTag("bb.reader_mode", process.env.BB_READER_MODE || "live");
}
