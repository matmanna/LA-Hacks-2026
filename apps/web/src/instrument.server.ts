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
  });
}
