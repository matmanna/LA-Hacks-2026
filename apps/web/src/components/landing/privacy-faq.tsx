import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@betterbill/ui/components/accordion";
import { Lock } from "lucide-react";

import { Section, SectionTitle } from "./section";

const FAQ = [
  [
    "Is this legal or medical advice?",
    "No. BetterBill is informational. It points out lines that don't match and shows you why. You decide what to do.",
  ],
  [
    "What kind of bill works best?",
    "An itemized hospital bill, with a line for each charge. If you only have a summary, we'll draft a request for the itemized version.",
  ],
  [
    "Do I need an account?",
    "Not to check a bill. You'll need a free account to save your case, send a letter, or have us call.",
  ],
  [
    "Will you contact the hospital without asking me?",
    "Never. You see the exact letter or call script first. Nothing goes out until you approve it, and we save the time you approved.",
  ],
  [
    "How do you know a price is too high?",
    "Hospitals publish price lists. When we compare your charge to one, we show the hospital's own number, the file it came from, and the date we read it.",
  ],
  [
    'What does "estimate" mean here?',
    "It's our best guess, not a promise. What you end up paying depends on the hospital.",
  ],
  [
    "What if I already paid, or the bill is in collections?",
    "You can still check it. Getting money back or handling collections is a separate process we don't handle yet.",
  ],
  ["Who made this?", "A team of four at LA Hacks 2026, in Los Angeles."],
] as const;

const PRIVACY = [
  "No account needed to see your results",
  "You choose what goes in each letter or call",
  "Calls share only your name, account ending, and the disputed lines",
  "This demo runs on synthetic bills only",
];

export function PrivacyFaq() {
  return (
    <Section id="faq" band>
      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <SectionTitle>Your bill stays your business.</SectionTitle>
          <p className="mt-4 text-base leading-6">
            We only use your bill to check it. We never sell your data.
          </p>
          <ul className="mt-6 space-y-3">
            {PRIVACY.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-base leading-6"
              >
                <Lock
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-muted-foreground text-sm leading-5">
            BetterBill is a hackathon project. We have not had a security audit
            yet, so please don't upload real bills today.
          </p>
        </div>
        <div className="mt-12 lg:col-span-7 lg:mt-0">
          <h2 className="sr-only">Frequently asked questions</h2>
          <Accordion>
            {FAQ.map(([question, answer]) => (
              <AccordionItem
                key={question}
                value={question}
                className="border-b"
              >
                <AccordionTrigger>{question}</AccordionTrigger>
                <AccordionContent>{answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </Section>
  );
}
