import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { expo } from "@better-auth/expo";
import type { Database } from "@betterbill/db";
import { caseEvent, caseTable } from "@betterbill/db/schema/app";
import * as schema from "@betterbill/db/schema/auth";
import { checkout, polar, portal } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { anonymous, phoneNumber } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";

import { createPolarClient } from "./lib/payments";
import { canText, sendText } from "./lib/sms";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  POLAR_ACCESS_TOKEN?: string;
  POLAR_SUCCESS_URL?: string;
  POLAR_SERVER?: string;
  PHONE_AUTH_BYPASS_CODE?: string;
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
      // Sign in with a phone number and a texted code. The number is also
      // where BetterBill texts when a hospital lookup is ready.
      phoneNumber({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        sendOTP: async ({ phoneNumber: to, code }) => {
          const bypassCode = env.PHONE_AUTH_BYPASS_CODE;
          if (bypassCode) {
            if (!/^\d{6}$/.test(bypassCode)) {
              throw new Error(
                "PHONE_AUTH_BYPASS_CODE must be exactly 6 digits",
              );
            }
            await database
              .update(schema.verification)
              .set({ value: `${bypassCode}:0` })
              .where(eq(schema.verification.identifier, to));
            return;
          }
          if (!canText(to)) {
            throw new APIError("BAD_REQUEST", {
              message: "This demo can only text numbers on the test list.",
            });
          }
          try {
            await sendText({
              to,
              text: `Your BetterBill code is ${code}. It expires in 5 minutes.`,
              idempotencyKey: `otp:${to}:${code}`,
            });
          } catch (error) {
            // Without Photon set up, local testing reads the code from here.
            if (process.env.NODE_ENV === "production") throw error;
            console.warn(
              `[sms] could not text ${to}; dev code: ${code}`,
              error,
            );
          }
        },
        signUpOnVerification: {
          getTempEmail: (number) =>
            `${number.replace(/\D/g, "")}@phone.betterbill.invalid`,
          getTempName: (number) => number,
        },
      }),
      expo(),
      tanstackStartCookies(),
    ],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
