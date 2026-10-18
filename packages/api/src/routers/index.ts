import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { actionRouter } from "./action";
import { assistanceRouter } from "./assistance";
import { auditRouter } from "./audit";
import { billRouter } from "./bill";
import { callRouter } from "./call";
import { caseRouter } from "./case";
import { evalRouter } from "./eval";
import { eventRouter } from "./event";
import { hospitalRouter } from "./hospital";
import { paymentRouter } from "./payment";
import { priceRouter } from "./price";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  case: caseRouter,
  bill: billRouter,
  audit: auditRouter,
  assistance: assistanceRouter,
  hospital: hospitalRouter,
  action: actionRouter,
  call: callRouter,
  event: eventRouter,
  eval: evalRouter,
  payment: paymentRouter,
  price: priceRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
