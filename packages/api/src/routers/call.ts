import { publicProcedure } from "../index";
import { ActionIdInput, CallIdInput } from "../inputs";
import { CallStarted, CallStatus } from "../outputs";

export const callRouter = {
  // STUB: owned by A. Places no call. Becomes protectedProcedure in B-11.
  start: publicProcedure
    .input(ActionIdInput)
    .output(CallStarted)
    .handler(({ input }) => ({
      callId: `call-${input.actionId}`,
      status: "stub",
    })),
  // STUB: owned by A
  status: publicProcedure
    .input(CallIdInput)
    .output(CallStatus)
    .handler(() => ({ status: "stub", transcript: null, outcome: null })),
};
