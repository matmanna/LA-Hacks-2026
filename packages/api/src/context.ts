import type { Session } from "@betterbill/auth";
import type { Database } from "@betterbill/db";

export type Context = {
  session: Session | null;
  db: Database;
  // true only when the request carried a valid x-bb-adapter-key header
  adapter: boolean;
};
