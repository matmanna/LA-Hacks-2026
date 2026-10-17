import { Section, SectionTitle } from "./section";

const STEPS = [
  {
    title: "Snap or paste your bill",
    body: "Take a photo of each page, or paste the text. You check every line we read before anything else happens.",
  },
  {
    title: "See what looks wrong, with proof",
    body: "Each flag shows the line, the rule or price it's based on, where that came from, and the date.",
  },
  {
    title: "Approve what we send",
    body: "We draft the letter or the call script. You read the exact words. Nothing goes out until you approve it.",
  },
];

const CONTRAST = [
  [
    "Who reviews",
    "Coders and negotiators review your records",
    "You see every check, with its source",
  ],
  [
    "When you see findings",
    "After your records are collected and reviewed",
    "Right after you confirm your lines",
  ],
  [
    "What you pay",
    "Often a share of what they save",
    "Free to check. Optional paid call",
  ],
  [
    "Who decides",
    "You authorize them to negotiate",
    "You approve each letter and call",
  ],
] as const;

export function How() {
  return (
    <Section id="how">
      <SectionTitle>Three steps. You stay in charge.</SectionTitle>
      <ol className="mt-10 grid gap-8 lg:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="border-t pt-4">
            <span className="font-serif text-[40px] text-primary tabular-nums leading-[44px]">
              {index + 1}
            </span>
            <h3 className="mt-2 font-semibold text-lg leading-6">
              {step.title}
            </h3>
            <p className="mt-2 text-base text-muted-foreground leading-6">
              {step.body}
            </p>
          </li>
        ))}
      </ol>

      <h3 className="mt-16 font-semibold text-lg leading-6">
        A different way to fix a bill
      </h3>
      <div className="mt-4 hidden rounded-2xl border md:block">
        <div className="grid grid-cols-3 border-b bg-muted font-medium text-muted-foreground text-xs uppercase tracking-[0.08em]">
          <span className="p-4" />
          <span className="p-4">Expert negotiation services</span>
          <span className="p-4">BetterBill</span>
        </div>
        {CONTRAST.map(([label, expert, us]) => (
          <div
            key={label}
            className="grid grid-cols-3 border-b text-sm leading-5 last:border-0"
          >
            <span className="p-4 font-medium">{label}</span>
            <span className="p-4 text-muted-foreground">{expert}</span>
            <span className="p-4">{us}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-4 md:hidden">
        {CONTRAST.map(([label, expert, us]) => (
          <dl key={label} className="rounded-2xl border p-4 text-sm leading-5">
            <dt className="font-medium text-muted-foreground text-xs uppercase tracking-[0.08em]">
              {label}
            </dt>
            <dd className="mt-2">
              <span className="block text-muted-foreground text-xs">
                Expert services
              </span>
              {expert}
            </dd>
            <dd className="mt-2">
              <span className="block text-muted-foreground text-xs">
                BetterBill
              </span>
              {us}
            </dd>
          </dl>
        ))}
      </div>
      <p className="mt-4 max-w-[60ch] text-muted-foreground text-sm leading-5">
        Expert services have hospital relationships we don't have. If you want
        someone to handle everything, they can be a good choice. BetterBill is
        for people who want to see the proof and act now.
      </p>
    </Section>
  );
}
