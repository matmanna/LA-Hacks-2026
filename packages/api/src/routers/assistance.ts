import { Assistance } from "@betterbill/core";

import { publicProcedure } from "../index";
import { AssistanceCheckInput } from "../inputs";

export const assistanceRouter = {
  // STUB: router B, screening logic C
  check: publicProcedure
    .input(AssistanceCheckInput)
    .output(Assistance)
    .handler(() => ({ status: "unknown" as const })),
};
