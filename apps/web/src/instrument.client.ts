import * as Sentry from "@sentry/tanstackstart-react";

import { baseSentryOptions } from "./lib/sentry";

// No-op when VITE_SENTRY_DSN is unset. Replay is intentionally off: bills are
// on screen.
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  Sentry.init({ ...baseSentryOptions, dsn });
}
