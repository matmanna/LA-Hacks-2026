import { Card } from "@betterbill/ui/components/card";

import { useSeenOnce } from "../motion";
import { Section, SectionTitle } from "../section";
import type { EvalView } from "./eval-data";

// Recall by lever as animated bars, plus the benchmark result as it stands.
export function PlansResults({ data }: { data: EvalView | null }) {
  const [ref, seen] = useSeenOnce<HTMLDivElement>(0.25);
  if (!data) {
    return (
      <Section id="results">
        <SectionTitle>Measured, not promised.</SectionTitle>
        <Card className="mt-10 max-w-xl">
          <h3 className="font-semibold text-lg leading-6">
            Measured results coming.
          </h3>
          <p className="text-base text-muted-foreground leading-6">
            We publish recall and false-flag rates with the bill count and date.
            We never show targets as results.
          </p>
        </Card>
      </Section>
    );
  }
  return (
    <Section id="results">
      <SectionTitle>Measured, not promised.</SectionTitle>
      <div ref={ref} className="mt-10 lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <h3 className="font-semibold text-lg leading-6">
            Seeded errors found, by check
          </h3>
          <ul className="mt-5 space-y-4">
            {data.levers.map((lever, i) => {
              const pct = lever.expected ? lever.caught / lever.expected : 0;
              return (
                <li key={lever.key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{lever.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {lever.caught} of {lever.expected}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full origin-left rounded-full bg-primary transition-transform duration-700 ease-out"
                      style={{
                        transform: `scaleX(${seen ? pct : 0})`,
                        transitionDelay: `${i * 90}ms`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 max-w-[60ch] text-muted-foreground text-sm leading-5">
            The team planted these errors on synthetic bills. This shows the
            rules work as designed. It is not a claim about real-world accuracy.
          </p>
        </div>
        {data.botm ? (
          <div className="mt-10 lg:col-span-5 lg:mt-0">
            <Card className="gap-3">
              <h3 className="font-semibold text-lg leading-6">
                Against published cases
              </h3>
              <p className="font-serif text-[44px] tabular-nums leading-[48px]">
                {data.botm.caught} of {data.botm.inScope}
              </p>
              <p className="text-base leading-6">
                in-scope reporter findings matched, across {data.botm.cases}{" "}
                recreated Bill of the Month cases.
              </p>
              <p className="text-muted-foreground text-sm leading-5">
                We also raised {data.botm.extraFlags} extra flags. We report the
                misses with the hits, because a result you can't check isn't
                one.
              </p>
            </Card>
          </div>
        ) : null}
      </div>
    </Section>
  );
}
