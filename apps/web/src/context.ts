import { timingSafeEqual } from "node:crypto";

import type { Context as ApiContext } from "@betterbill/api/context";

import { ENV } from "./env.server";
import { auth, db } from "./services";

export const ADAPTER_KEY_HEADER = "x-bb-adapter-key";

// Shared secret for the Fetch adapter. False when the key is not configured.
export function isAdapterRequest(req: Request): boolean {
  const expected = ENV.BB_ADAPTER_KEY;
  const given = req.headers.get(ADAPTER_KEY_HEADER);
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createContext({
  req,
}: {
  req: Request;
}): Promise<ApiContext> {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  return {
    db,
    session,
    adapter: isAdapterRequest(req),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
