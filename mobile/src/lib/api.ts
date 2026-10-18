import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import Constants from "expo-constants";

// Type only: erased at build time, so no server code reaches the phone.
import type { AppRouterClient } from "../../../packages/api/src/routers/index";

// Where the BetterBill web server runs.
// 1. EXPO_PUBLIC_API_URL wins (for example the Vercel preview URL).
// 2. Otherwise use the computer running Metro, on port 3001. Start the web
//    app with `bun run dev:web -- --host` so the phone can reach it.
function resolveBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${host ?? "localhost"}:3001`;
}

export const API_URL = resolveBaseUrl();

export const api: AppRouterClient = createORPCClient(
  new RPCLink({ url: `${API_URL}/api/rpc` }),
);

export type CaseDetail = Awaited<ReturnType<typeof api.case.get>>;
export type CaseEvent = Awaited<ReturnType<typeof api.event.list>>[number];

export function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    if (error.message.includes("Network request failed")) {
      return `Can't reach BetterBill at ${API_URL}. Is the web server running with --host?`;
    }
    return error.message;
  }
  return "Something went wrong on our side. Try again in a moment.";
}
