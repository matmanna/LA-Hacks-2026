import type { RequestLogger } from "evlog";
import {
  type BetterAuthInstance,
  createAuthMiddleware,
} from "evlog/better-auth";
import { definePlugin } from "nitro";

import { auth } from "../../src/services";

// evlog's createAuthIdentifier is typed for the Nitro v2 event shape. Nitro v3
// passes { req: Request } with the evlog logger on context, so call the
// framework-agnostic middleware with explicit headers and path instead.
const identify = createAuthMiddleware(auth as BetterAuthInstance, {
  exclude: ["/api/auth/**"],
  maskEmail: true,
});

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("request", async (event) => {
    const log = (event as { context?: { log?: RequestLogger } }).context?.log;
    if (!log) return;
    await identify(log, event.req.headers, new URL(event.req.url).pathname);
  });
});
