import { Card, CardTitle } from "@betterbill/ui/components/card";

import { Section, SectionTitle } from "../section";

const CARDS = [
  [
    "Pre-payment review",
    "Check itemized hospital bills before a claim is paid. Flags come with the line, the rule or price, and the source.",
  ],
  [
    "Post-payment review",
    "Look back at paid claims to find duplicates, unit errors, and prices above the hospital's own published rates.",
  ],
  [
    "Member self-serve",
    "Members snap their bill and see what looks wrong. They approve every letter and call, so nothing happens behind their back.",
  ],
] as const;

export function Fit() {
  return (
    <Section id="approach">
      <SectionTitle>One review, three places to use it.</SectionTitle>
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {CARDS.map(([title, body]) => (
          <Card key={title}>
            <CardTitle>{title}</CardTitle>
            <p className="text-base text-muted-foreground leading-6">{body}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
