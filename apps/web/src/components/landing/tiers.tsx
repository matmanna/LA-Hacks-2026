import { type Tier, TierBadge } from "@betterbill/ui/components/bb/tier-badge";

import { Section, SectionTitle } from "./section";

const TIERS: { tier: Tier; body: string }[] = [
  {
    tier: "confirmed",
    body: "Math on your own documents. Example: the same test on the same day, billed twice.",
  },
  {
    tier: "rule",
    body: "A published billing rule, with its source. Example: more units of a drug than one visit allows.",
  },
  {
    tier: "published",
    body: "The hospital's own price list, with the date we read it. Example: an MRI billed above its listed cash price.",
  },
  {
    tier: "estimate",
    body: "Our best estimate, clearly labeled. Example: whether you might qualify for financial assistance.",
  },
];

export function Tiers() {
  return (
    <Section id="evidence" band>
      <SectionTitle>Every flag tells you how sure we are.</SectionTitle>
      <p className="mt-4 max-w-[60ch] text-base text-muted-foreground leading-6 lg:text-lg lg:leading-7">
        Some problems are simple math. Others depend on a rule or a price list.
        We label each one so you know what you're looking at.
      </p>
      <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TIERS.map(({ tier, body }) => (
          <li key={tier} className="rounded-2xl border bg-card p-5">
            <TierBadge tier={tier} />
            <p className="mt-3 text-base leading-6">{body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-muted-foreground text-sm leading-5">
        We never call a charge illegal or fraud. We show you what doesn't match,
        and you decide what to do.
      </p>
    </Section>
  );
}
