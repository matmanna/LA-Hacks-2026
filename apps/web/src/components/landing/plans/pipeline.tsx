import { Database, FileSearch, ListChecks, ScrollText } from "lucide-react";

import { PortedEdge } from "../edge";
import { Section, SectionTitle } from "../section";

const NODES = [
  [Database, "Bill in", "Photo, PDF, or text. Every line read and confirmed."],
  [
    FileSearch,
    "Audit",
    "Duplicates, units, insurer statement, published price.",
  ],
  [
    ListChecks,
    "Evidence",
    "Each flag carries its tier, source, and capture date.",
  ],
  [ScrollText, "Event log", "Append-only. Every approval is a recorded event."],
] as const;

export function Pipeline() {
  return (
    <Section id="pipeline">
      <SectionTitle>How a review runs.</SectionTitle>
      <ol className="mt-10 flex flex-col items-stretch lg:flex-row">
        {NODES.map(([Icon, title, body], i) => (
          <li key={title} className="contents">
            {i > 0 ? (
              <div className="flex h-8 justify-center lg:h-auto lg:w-14 lg:items-center">
                <PortedEdge axis="y" className="lg:hidden" delay={i * 0.5} />
                <PortedEdge className="hidden w-full lg:flex" delay={i * 0.5} />
              </div>
            ) : null}
            <div className="lp-lift flex-1 rounded-2xl border bg-card p-5 hover:shadow-card">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <Icon
                  className="size-5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </span>
              <h3 className="mt-3 font-semibold text-lg leading-6">{title}</h3>
              <p className="mt-1 text-base text-muted-foreground leading-6">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
