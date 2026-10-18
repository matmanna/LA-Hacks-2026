import { Card } from "@betterbill/ui/components/card";

import { Section, SectionTitle } from "../section";

type Results = Record<string, unknown> | null;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function dateOf(results: Record<string, unknown>) {
  const raw = results.generatedAt;
  if (typeof raw !== "string") return null;
  const date = new Date(raw);
  // The API stub reports 1970. Never show that as a measurement date.
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2020) return null;
  return dateFormat.format(date);
}

type Stat = { value: string; label: string; caption: string };

function statsFrom(results: Results): Stat[] {
  if (!results) return [];
  const date = dateOf(results);
  if (!date) return [];
  const seeded = results.seeded as Record<string, unknown> | undefined;
  const stats: Stat[] = [];
  if (seeded && isNum(seeded.recall) && isNum(seeded.bills)) {
    stats.push({
      value: `${seeded.recall}%`,
      label: "of seeded errors found",
      caption: `Measured on ${seeded.bills} synthetic bills, ${date}.`,
    });
  }
  if (seeded && isNum(seeded.falseFlagsOnClean) && isNum(seeded.cleanBills)) {
    stats.push({
      value: String(seeded.falseFlagsOnClean),
      label: "false flags on clean bills",
      caption: `Measured on ${seeded.cleanBills} clean synthetic bills, ${date}.`,
    });
  }
  const benchmark = results.benchmark as Record<string, unknown> | undefined;
  if (benchmark && isNum(benchmark.matched) && isNum(benchmark.total)) {
    stats.push({
      value: `${benchmark.matched} of ${benchmark.total}`,
      label: "reporter findings matched",
      caption: `Recreated KFF Health News "Bill of the Month" cases, ${date}.`,
    });
  }
  return stats;
}

export function PlansResults({ results }: { results: Results }) {
  const stats = statsFrom(results);
  return (
    <Section id="results">
      <SectionTitle>Measured, not promised.</SectionTitle>
      {stats.length > 0 ? (
        <dl className="mt-10 grid gap-8 lg:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="border-t pt-4">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-serif text-[40px] tabular-nums leading-[44px]">
                  {stat.value}
                </span>
                <span className="block text-base leading-6">{stat.label}</span>
                <span className="block text-muted-foreground text-sm leading-5">
                  {stat.caption}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <Card className="mt-10 max-w-xl">
          <h3 className="font-semibold text-lg leading-6">
            Measured results coming.
          </h3>
          <p className="text-base text-muted-foreground leading-6">
            We publish recall and false-flag rates with the bill count and date.
            We never show targets as results.
          </p>
        </Card>
      )}
    </Section>
  );
}
