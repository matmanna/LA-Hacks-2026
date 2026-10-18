import { Card, CardTitle } from "@betterbill/ui/components/card";
import { Check, Circle } from "lucide-react";

import { Section, SectionTitle } from "../section";

const TODAY = [
  "Synthetic data only",
  "Model and phone keys stay on the server",
  "Every letter or call needs a recorded member approval",
  "Calls identify themselves as an automated assistant",
];
const NOT_YET = [
  "No HIPAA program or business associate agreements",
  "No SOC 2 report",
  "No real member data until those are in place",
];

function List({ items, icon }: { items: string[]; icon: "check" | "circle" }) {
  const Icon = icon === "check" ? Check : Circle;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-base leading-6">
          <Icon
            className={`mt-0.5 size-5 shrink-0 ${icon === "check" ? "text-mint-ink" : "text-muted-foreground"}`}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function Security() {
  return (
    <Section id="security">
      <SectionTitle>Security, stated plainly.</SectionTitle>
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Today</CardTitle>
          <List items={TODAY} icon="check" />
        </Card>
        <Card>
          <CardTitle>Not yet</CardTitle>
          <List items={NOT_YET} icon="circle" />
        </Card>
      </div>
      <p className="mt-6 text-muted-foreground text-sm leading-5">
        We'd rather tell you what's missing than show a badge we haven't earned.
      </p>
    </Section>
  );
}
