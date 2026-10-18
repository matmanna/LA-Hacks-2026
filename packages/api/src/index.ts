import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";
import { observe } from "./observe";

export const o = os.$context<Context>();

const observed = o.middleware(({ path, next }, input) =>
  observe({ path, next }, input),
);

export const publicProcedure = o.use(observed);

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

// B-11: value before signup. Checking a bill needs no account; approving,
// sending, and calling need a real (non-anonymous) one. Enforced only when
// BB_REQUIRE_ACCOUNT=true so the demo flow keeps working until the UI can
// prompt for sign-up.
export const accountRequired = () => process.env.BB_REQUIRE_ACCOUNT === "true";

export const ACCOUNT_MESSAGE = "Create an account to save, send, or call.";

const requireRealAccount = o.middleware(async ({ context, next }) => {
  if (accountRequired()) {
    const user = context.session?.user as
      | { isAnonymous?: boolean | null }
      | undefined;
    if (!user || user.isAnonymous) {
      throw new ORPCError("UNAUTHORIZED", { message: ACCOUNT_MESSAGE });
    }
  }
  return next();
});

export const accountProcedure = publicProcedure.use(requireRealAccount);
