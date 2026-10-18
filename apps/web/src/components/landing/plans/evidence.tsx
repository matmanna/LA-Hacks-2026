import { type Tier, TierBadge } from "@betterbill/ui/components/bb/tier-badge";

import { Section, SectionTitle } from "../section";

const ROWS: [Tier, string][] = [
  ["confirmed", "Arithmetic on the submitted documents"],
  ["rule", "A cited billing rule with its source and date"],
  ["published", "The hospital's published price file, with capture date"],
  ["estimate", "A labeled estimate, never counted as confirmed"],
];

const EVENT_EXAMPLE = [
  ["at", "2026-10-17T23:10:00Z"],
  ["actor", "user"],
  ["type", "action.approve"],
  ["summary", "Approved dispute letter"],
];

export function PlansEvidence() {
  return (
    <Section id="evidence" band>
      <SectionTitle>Evidence you can audit.</SectionTitle>
      <div className="mt-10 lg:grid lg:grid-cols-12 lg:gap-12">
        <ul className="space-y-4 lg:col-span-5">
          {ROWS.map(([tier, line]) => (
            <li key={tier} className="space-y-1">
              <TierBadge tier={tier} />
              <p className="text-base leading-6">{line}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10 lg:col-span-7 lg:mt-0">
          <h3 className="font-semibold text-lg leading-6">
            Every action is an event
          </h3>
          <p className="mt-1 text-muted-foreground text-xs leading-4">
            Example event. Synthetic data.
          </p>
          <dl className="mt-3 rounded-2xl border bg-card p-4 text-xs tabular-nums leading-4">
            {EVENT_EXAMPLE.map(([key, value]) => (
              <div key={key} className="grid grid-cols-[72px_1fr] gap-2 py-1.5">
                <dt className="text-muted-foreground">{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-muted-foreground text-sm leading-5">
            Events are append-only. Corrections are new entries, so you can see
            who changed what and when.
          </p>
        </div>
      </div>
    </Section>
  );
}
