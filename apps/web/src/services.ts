import { createAuth } from "@betterbill/auth";
import { createDb } from "@betterbill/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
