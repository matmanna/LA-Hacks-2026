// Polar checkout (sandbox by default). Fee math lives in core; this file only
// loads the stored audit, calls Polar server-side, and records events.

import { createPolarClient } from "@betterbill/auth/lib/payments";
import { applyDevOverride, savingsFee } from "@betterbill/core";
import type { Database } from "@betterbill/db";
import { ORPCError } from "@orpc/server";
import type { PaymentQuote } from "../outputs";
import { addEvent, latestAudit, listEvents, loadBill } from "../repo/cases";
import { auditResult } from "../routers/audit";

type PayEnv = {
  POLAR_ACCESS_TOKEN?: string;
  POLAR_SERVER?: string;
  POLAR_SAVINGS_PRODUCT_ID?: string;
  POLAR_BULK_PRODUCT_ID?: string;
  POLAR_DEV_PROMO_CODE?: string;
  POLAR_SUCCESS_URL?: string;
};

const payEnv = (): PayEnv => ({
  POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN,
  POLAR_SERVER: process.env.POLAR_SERVER,
  POLAR_SAVINGS_PRODUCT_ID: process.env.POLAR_SAVINGS_PRODUCT_ID,
  POLAR_BULK_PRODUCT_ID: process.env.POLAR_BULK_PRODUCT_ID,
  POLAR_DEV_PROMO_CODE: process.env.POLAR_DEV_PROMO_CODE,
  POLAR_SUCCESS_URL: process.env.POLAR_SUCCESS_URL,
});

const NOT_CONFIGURED = "Payments are not configured";

function requireConfigured(productId: string | undefined, env: PayEnv) {
  if (!env.POLAR_ACCESS_TOKEN || !productId) {
    throw new ORPCError("PRECONDITION_FAILED", { message: NOT_CONFIGURED });
  }
  return { token: env.POLAR_ACCESS_TOKEN, productId };
}

async function computeQuote(
  db: Database,
  caseId: string,
  promoCode?: string,
): Promise<PaymentQuote> {
  const env = payEnv();
  const run = await latestAudit(db, caseId);
  const loaded = run ? await loadBill(db, caseId) : null;
  if (!run || !loaded) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Check the bill before paying.",
    });
  }
  const { savings } = auditResult(caseId, loaded.bill, run.flags, 0);
  const fee = applyDevOverride(savingsFee(savings.confirmedCents), {
    promoCode,
    devPromoCode: env.POLAR_DEV_PROMO_CODE,
    server: env.POLAR_SERVER,
  });
  return {
    caseId,
    ...fee,
    potentialLowCents: savings.potentialLowCents,
    potentialHighCents: savings.potentialHighCents,
    paymentsEnabled: Boolean(
      env.POLAR_ACCESS_TOKEN && env.POLAR_SAVINGS_PRODUCT_ID,
    ),
  };
}

export async function quotePayment(db: Database, caseId: string) {
  const quote = await computeQuote(db, caseId);
  const summary = quote.owed
    ? `Fee quoted: ${quote.feeCents} cents (${quote.percentLabel} of confirmed savings)`
    : "No fee: nothing confirmed to charge on";
  // Append-only log, but not one row per page view: skip an identical repeat.
  const seen = (await listEvents(db, caseId)).some(
    (e) => e.type === "payment.quoted" && e.summary === summary,
  );
  if (!seen) await addEvent(db, caseId, "payment.quoted", summary);
  return quote;
}

// Never put the token in a message: only the SDK's own error text is passed on.
function polarFailure(): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: "We could not open the checkout. Please try again.",
  });
}

export async function createSavingsCheckout(
  db: Database,
  input: { caseId: string; promoCode?: string },
) {
  const env = payEnv();
  const { token, productId } = requireConfigured(
    env.POLAR_SAVINGS_PRODUCT_ID,
    env,
  );
  const quote = await computeQuote(db, input.caseId, input.promoCode);
  if (!quote.owed) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Nothing is owed: no savings are confirmed for this case.",
    });
  }
  let checkout: { id: string; url: string };
  try {
    const polar = createPolarClient({
      POLAR_ACCESS_TOKEN: token,
      POLAR_SERVER: env.POLAR_SERVER,
    });
    checkout = await polar.checkouts.create({
      products: [productId],
      amount: quote.feeCents,
      successUrl: env.POLAR_SUCCESS_URL,
      metadata: { caseId: input.caseId },
    });
  } catch {
    polarFailure();
  }
  await addEvent(
    db,
    input.caseId,
    "payment.checkout_created",
    `Checkout opened for ${quote.feeCents} cents`,
    { actor: "user", artifactRef: checkout.id },
  );
  return { url: checkout.url, checkoutId: checkout.id };
}

export async function createBulkCheckout(input: { promoCode?: string }) {
  const env = payEnv();
  const { token, productId } = requireConfigured(
    env.POLAR_BULK_PRODUCT_ID,
    env,
  );
  const code = input.promoCode?.trim() || undefined;
  try {
    const polar = createPolarClient({
      POLAR_ACCESS_TOKEN: token,
      POLAR_SERVER: env.POLAR_SERVER,
    });
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: env.POLAR_SUCCESS_URL,
      metadata: { plan: "bulk" },
    });
    if (code) {
      await polar.checkouts.clientUpdate({
        clientSecret: checkout.clientSecret,
        checkoutUpdatePublic: { discountCode: code },
      });
    }
    return { url: checkout.url, checkoutId: checkout.id };
  } catch {
    polarFailure();
  }
}
