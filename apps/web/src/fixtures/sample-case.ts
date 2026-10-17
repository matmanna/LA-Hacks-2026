// Synthetic. Placeholder values until audit.run output for the demo bill replaces them.
// Nothing here is a result: the amounts are illustrative and the published-price
// figure waits on a captured price file with a date (plan C, C-05).
import type { Tier } from "@betterbill/ui/components/bb/tier-badge";

export const sampleCase = {
  hospital: {
    name: "Sample General Hospital",
    city: "Los Angeles",
    state: "CA",
  },
  summary: {
    billedCents: 1_200_000,
    fairBalanceCents: 1_071_600,
    fairBalanceLowCents: 1_011_600,
    lessThanBilledCents: 128_400,
    isEstimate: true,
  },
  savings: {
    confirmedCents: 8_400,
    potentialLowCents: 120_000,
    potentialHighCents: 180_000,
  },
  flags: [
    {
      id: "f1",
      lever: "duplicate",
      tier: "confirmed" as Tier,
      title: "Same lab test billed twice",
      explanation: "CBC with differential (85025), same date, $84.00 each.",
      amountCents: 8_400,
    },
    {
      id: "f2",
      lever: "published_price",
      tier: "published" as Tier,
      title: "Higher than the hospital's published price",
      explanation: "MRI lumbar, no contrast (72148) billed $6,900.00.",
      amountCents: 120_000,
    },
    {
      id: "f3",
      lever: "eob_mismatch",
      tier: "confirmed" as Tier,
      title: "Bill asks for more than your insurer says",
      explanation: "Your EOB lists a lower amount you owe.",
      amountCents: 30_000,
    },
  ],
};
