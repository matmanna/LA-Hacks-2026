import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@betterbill/db";
import * as schema from "@betterbill/db/schema/auth";
import { polar, checkout, portal } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { createPolarClient } from "./lib/payments";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  POLAR_ACCESS_TOKEN: string;
  POLAR_SUCCESS_URL: string;
};

export function createAuth(env: AuthConfig, database: Database) {
  return betterAuth({
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    trustedOrigins: [env.BETTER_AUTH_URL],
    emailAndPassword: { enabled: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [
      polar({
        client: createPolarClient(env),
        createCustomerOnSignUp: true,
        use: [
          checkout({
            products: [{ productId: "your-product-id", slug: "pro" }],
            successUrl: env.POLAR_SUCCESS_URL,
            authenticatedUsersOnly: true,
          }),
          portal(),
        ],
      }),
      tanstackStartCookies(),
    ],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
