import { Section, SectionTitle } from "../section";

const COLUMNS = [
  [
    "Typed API",
    "Every step is an API call: create a case, read a bill, run the audit, draft a letter. An OpenAPI description is available.",
  ],
  [
    "Case events",
    "Each case keeps an append-only event log you can read back. Webhooks are on the roadmap.",
  ],
  [
    "Intake today",
    "Photos, PDFs, and pasted text. Claim file intake is on the roadmap, not built.",
  ],
] as const;

export function Integration() {
  return (
    <Section id="integration" band>
      <SectionTitle>Built to plug in.</SectionTitle>
      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        {COLUMNS.map(([title, body]) => (
          <div key={title} className="border-t pt-4">
            <h3 className="font-semibold text-lg leading-6">{title}</h3>
            <p className="mt-2 text-base text-muted-foreground leading-6">
              {body}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
