import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { expo } from "@better-auth/expo";
import type { Database } from "@betterbill/db";
import * as schema from "@betterbill/db/schema/auth";
import { checkout, polar, portal } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { createPolarClient } from "./lib/payments";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  POLAR_ACCESS_TOKEN?: string;
  POLAR_SUCCESS_URL?: string;
};

// Polar is optional: the plugin is only enabled when both values are set.
function polarPlugins(env: AuthConfig) {
  if (!env.POLAR_ACCESS_TOKEN || !env.POLAR_SUCCESS_URL) return [];
  return [
    polar({
      client: createPolarClient({ POLAR_ACCESS_TOKEN: env.POLAR_ACCESS_TOKEN }),
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
  ];
}

export function createAuth(env: AuthConfig, database: Database) {
  return betterAuth({
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    trustedOrigins: [
      env.BETTER_AUTH_URL,
      // Expo app (apps/native): deep link scheme and Expo Go / Metro origins.
      "betterbill://",
      "exp://",
      "http://localhost:8081",
    ],
    emailAndPassword: { enabled: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [...polarPlugins(env), expo(), tanstackStartCookies()],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
