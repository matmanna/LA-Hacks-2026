import { FEE_BPS, MAX_FEE_CENTS, percentLabel } from "@betterbill/core";
import { Money } from "@betterbill/ui/components/bb/money";
import { Button } from "@betterbill/ui/components/button";
import { Card } from "@betterbill/ui/components/card";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { ArrowSlide } from "./arrow-slide";
import { Section, SectionTitle } from "./section";

function Checks({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-base leading-6">
          <Check
            className="mt-0.5 size-5 shrink-0 text-mint-ink"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function Pricing() {
  return (
    <Section id="pricing">
      <SectionTitle>What it costs</SectionTitle>
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Card className="gap-5">
          <h3 className="font-semibold text-lg leading-6">Bill check</h3>
          <p className="font-serif text-[40px] leading-[44px]">Free</p>
          <Checks
            items={[
              "Reads every line on your bill",
              "Flags with evidence and sources",
              "Savings estimate with the math shown",
              "Dispute letter you can edit and send",
              "Financial assistance check",
            ]}
          />
          <Button nativeButton={false} render={<Link to="/check" />}>
            Check my bill
            <ArrowSlide />
          </Button>
        </Card>
        <Card className="gap-5">
          <h3 className="font-semibold text-lg leading-6">
            When we save you money
          </h3>
          <p className="font-serif text-[40px] leading-[44px]">
            {percentLabel(FEE_BPS)}
          </p>
          <p className="text-base text-muted-foreground leading-6">
            Of confirmed savings only, capped at{" "}
            <Money cents={MAX_FEE_CENTS} cents_display="hide" />. Estimates
            never count, and if nothing is confirmed you pay nothing. Calls to
            billing use a script you approve.
          </p>
          <Checks
            items={[
              "You approve the script first",
              "The call says it's an automated assistant",
              "Transcript and reference number saved to your case",
            ]}
          />
          <p className="text-muted-foreground text-xs leading-4">
            The fee is shown before you pay. Payments run in Polar test mode
            during LA Hacks; no real charges.
          </p>
        </Card>
      </div>
    </Section>
  );
}
