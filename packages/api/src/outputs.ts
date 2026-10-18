// Procedure outputs that are not core contracts (plan B section 3.2).
import {
  Action,
  AuditResult,
  Bill,
  CaseSummary,
  Eob,
  Tier,
} from "@betterbill/core";
import { z } from "zod";

export const CaseDetail = z.object({
  case: CaseSummary,
  bill: Bill.nullable(),
  eob: Eob.nullable(),
  audit: AuditResult.nullable(),
  actions: z.array(Action),
});
export type CaseDetail = z.infer<typeof CaseDetail>;

export const ConfirmLinesOutput = z.object({
  caseId: z.string(),
  status: z.literal("lines_confirmed"),
});

// draftHash round-trips through the client so action.approve can prove the user
// approved this exact text (A-05).
export const DraftLetterResult = z.object({
  action: Action,
  draftHash: z.string(),
  claims: z.array(
    z.object({
      flagId: z.string(),
      paragraphIndex: z.number().int(),
      amountCents: z.number().int(),
      tier: Tier,
    }),
  ),
  usedFallback: z.boolean(),
});

export const CallStarted = z.object({ callId: z.string(), status: z.string() });

export const CallStatus = z.object({
  status: z.string(),
  transcript: z.string().nullable(),
  outcome: z.string().nullable(),
});

// Passthrough of data/eval/results.json; generatedAt is null until C ships it.
export const EvalResults = z.looseObject({
  generatedAt: z.string().nullable(),
});

export const ShareResult = z.object({ token: z.string(), path: z.string() });
export const RevokeResult = z.object({
  caseId: z.string(),
  revoked: z.boolean(),
});

// Fee breakdown computed on the server from the stored audit (core savingsFee).
export const PaymentQuote = z.object({
  caseId: z.string(),
  owed: z.boolean(),
  confirmedCents: z.number().int(),
  potentialLowCents: z.number().int(),
  potentialHighCents: z.number().int(),
  feeBps: z.number().int(),
  percentLabel: z.string(),
  feeCents: z.number().int(),
  minCents: z.number().int(),
  capCents: z.number().int(),
  capped: z.boolean(),
  devOverride: z.boolean(),
  note: z.string(),
  // false when POLAR_ACCESS_TOKEN or the product id is missing
  paymentsEnabled: z.boolean(),
});
export type PaymentQuote = z.infer<typeof PaymentQuote>;

export const CheckoutResult = z.object({
  url: z.string(),
  checkoutId: z.string(),
});

// hospital.lookup / hospital.lookupStatus: the background Browser Use lookup
// of a hospital's assistance policy. liveViewUrl goes only to the app.
export const LookupState = z.enum([
  "none",
  "on_file",
  "unavailable",
  "running",
  "done",
  "failed",
]);
export const LookupStatus = z.object({
  state: LookupState,
  hospitalName: z.string().nullable(),
  startedAt: z.string().nullable(),
  steps: z.array(z.object({ at: z.string(), text: z.string() })),
  liveViewUrl: z.string().nullable(),
  policy: z
    .object({
      policyTitle: z.string(),
      policyUrl: z.string(),
      freeCareMaxFplPct: z.number().nullable(),
      discountMaxFplPct: z.number().nullable(),
      billingPhone: z.string().nullable(),
    })
    .nullable(),
});
export type LookupStatus = z.infer<typeof LookupStatus>;

// "Before you go" price comparison (core prices/). Amounts are integer cents
// from the hospital's own machine-readable price file.
export const PriceService = z.object({
  code: z.string(),
  name: z.string(),
  short: z.string(),
  what: z.string(),
  notCovered: z.string(),
  terms: z.array(z.string()),
});
export const NearbyPrice = z.object({
  hospitalKey: z.string(),
  hospitalName: z.string(),
  address: z.string(),
  distanceMiles: z.number(),
  discountedCashCents: z.number().int().nullable(),
  grossChargeCents: z.number().int().nullable(),
  setting: z.string(),
  capturedAt: z.string(),
  sourceUrl: z.string(),
  sourceSha256: z.string().nullable(),
  pageUrl: z.string().nullable(),
  fileUpdatedOn: z.string().nullable(),
  policy: z
    .object({
      policyUrl: z.string(),
      capturedAt: z.string(),
      freeCareMaxFplPct: z.number().nullable(),
      discountMaxFplPct: z.number().nullable(),
    })
    .nullable(),
  rank: z.number().int().nullable(),
  shareOfHighest: z.number().nullable(),
  lat: z.number(),
  lng: z.number(),
});
export const NearbyPrices = z.object({
  rows: z.array(NearbyPrice),
  summary: z.object({
    hospitals: z.number().int(),
    priced: z.number().int(),
    lowCents: z.number().int().nullable(),
    middleCents: z.number().int().nullable(),
    highCents: z.number().int().nullable(),
    middleShareOfHighest: z.number().nullable(),
  }),
});

// A hospital across every service: counts of lowest and below-middle prices
// near the patient (core prices/hospitals). Never an average.
export const HospitalSummary = z.object({
  hospitalKey: z.string(),
  hospitalName: z.string(),
  address: z.string(),
  distanceMiles: z.number(),
  lat: z.number(),
  lng: z.number(),
  services: z.number().int(),
  lowestOn: z.number().int(),
  belowMiddleOn: z.number().int(),
});
export const HospitalDetail = HospitalSummary.extend({
  prices: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      short: z.string(),
      discountedCashCents: z.number().int().nullable(),
      grossChargeCents: z.number().int().nullable(),
      rank: z.number().int().nullable(),
      priced: z.number().int(),
      lowest: z.boolean(),
      belowMiddle: z.boolean(),
    }),
  ),
  capturedAt: z.string(),
  sourceUrl: z.string(),
  sourceSha256: z.string().nullable(),
  pageUrl: z.string().nullable(),
  fileUpdatedOn: z.string().nullable(),
  policy: NearbyPrice.shape.policy,
});

// A lab's own online self-pay price for a service (core prices/labs).
export const LabPrice = z.object({
  labKey: z.string(),
  labName: z.string(),
  productName: z.string(),
  cashCents: z.number().int(),
  detail: z.string().nullable(),
  quote: z.string(),
  sourceUrl: z.string(),
  sourceSha256: z.string().nullable(),
  capturedAt: z.string(),
});
