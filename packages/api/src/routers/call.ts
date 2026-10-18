import { accountProcedure, publicProcedure } from "../index";
import { ActionIdInput, CallIdInput } from "../inputs";
import { CallStarted, CallStatus } from "../outputs";
import { callStatus, startCall } from "../services/call";

export const callRouter = {
  // Needs a real account when BB_REQUIRE_ACCOUNT=true (B-11).
  start: accountProcedure
    .input(ActionIdInput)
    .output(CallStarted)
    .handler(({ input, context }) => startCall(context.db, input)),
  status: publicProcedure
    .input(CallIdInput)
    .output(CallStatus)
    .handler(({ input, context }) => callStatus(context.db, input)),
};
