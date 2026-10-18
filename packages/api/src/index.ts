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
