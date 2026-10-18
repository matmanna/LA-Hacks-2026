import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@betterbill/db";
import { caseEvent, caseTable } from "@betterbill/db/schema/app";
import * as schema from "@betterbill/db/schema/auth";
import { checkout, polar, portal } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { anonymous } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";

import { createPolarClient } from "./lib/payments";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  POLAR_ACCESS_TOKEN?: string;
  POLAR_SUCCESS_URL?: string;
  POLAR_SERVER?: string;
};

// Polar is optional: the plugin is only enabled when both values are set.
function polarPlugins(env: AuthConfig) {
  if (!env.POLAR_ACCESS_TOKEN || !env.POLAR_SUCCESS_URL) return [];
  return [
    polar({
      client: createPolarClient({
        POLAR_ACCESS_TOKEN: env.POLAR_ACCESS_TOKEN,
        POLAR_SERVER: env.POLAR_SERVER,
      }),
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
    trustedOrigins: [env.BETTER_AUTH_URL],
    emailAndPassword: { enabled: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [
      ...polarPlugins(env),
      // Anyone can check a bill as an anonymous user. When they sign up,
      // their cases move to the new account (the anonymous user is deleted).
      anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          const moved = await database
            .update(caseTable)
            .set({ userId: newUser.user.id })
            .where(eq(caseTable.userId, anonymousUser.user.id))
            .returning({ id: caseTable.id });
          if (moved.length > 0) {
            await database.insert(caseEvent).values(
              moved.map((c) => ({
                id: crypto.randomUUID(),
                caseId: c.id,
                actor: "user",
                type: "case.claimed",
                summary: "Saved to a new account",
              })),
            );
          }
        },
      }),
      tanstackStartCookies(),
    ],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
