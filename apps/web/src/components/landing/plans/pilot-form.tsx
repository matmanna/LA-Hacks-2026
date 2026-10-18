import { Button } from "@betterbill/ui/components/button";
import { Card } from "@betterbill/ui/components/card";
import { Input } from "@betterbill/ui/components/input";
import { Label } from "@betterbill/ui/components/label";
import { Textarea } from "@betterbill/ui/components/textarea";
import { type FormEvent, useState } from "react";
import { ArrowSlide } from "../arrow-slide";
import { Section, SectionTitle } from "../section";

const ROLES = [
  "Self-funded employer",
  "TPA",
  "Health plan",
  "Broker or consultant",
  "Other",
];

const INCLUDES = [
  "A review of sample bills you choose",
  "Evidence reports for every flag",
  "A member flow your team can try",
];

const PILOT_EMAIL = import.meta.env.VITE_PILOT_EMAIL as string | undefined;

export function PilotForm() {
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!PILOT_EMAIL) return;
    const data = new FormData(event.currentTarget);
    const body = [
      `Name: ${data.get("name")}`,
      `Work email: ${data.get("email")}`,
      `Organization: ${data.get("org")}`,
      `Role: ${data.get("role")}`,
      `What they would like to test: ${data.get("test") ?? ""}`,
    ].join("\n");
    window.location.href = `mailto:${PILOT_EMAIL}?subject=${encodeURIComponent("BetterBill pilot")}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <Section id="pilot" band>
      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <SectionTitle>Pilot partners wanted.</SectionTitle>
          <p className="mt-4 text-base leading-6">
            We're looking for one or two self-funded employers, TPAs, or plans
            to shape a pilot on synthetic or de-identified data.
          </p>
          <h3 className="mt-6 font-semibold text-lg leading-6">
            A pilot includes
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-6">
            {INCLUDES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <Card className="mt-10 lg:col-span-7 lg:mt-0">
          {sent ? (
            <p role="status" className="font-semibold text-lg leading-6">
              Thanks. We'll reply by email.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pilot-name">Name</Label>
                <Input
                  id="pilot-name"
                  name="name"
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pilot-email">Work email</Label>
                <Input
                  id="pilot-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pilot-org">Organization</Label>
                <Input
                  id="pilot-org"
                  name="org"
                  required
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pilot-role">Your role</Label>
                <select
                  id="pilot-role"
                  name="role"
                  className="h-12 w-full rounded-xl border border-transparent bg-muted px-4 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  {ROLES.map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pilot-test">What would you like to test?</Label>
                <Textarea id="pilot-test" name="test" />
              </div>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={!PILOT_EMAIL}
              >
                Book a pilot
                <ArrowSlide />
              </Button>
              {PILOT_EMAIL ? null : (
                <p className="text-muted-foreground text-xs leading-4">
                  Pilot email not configured
                </p>
              )}
              <p className="text-muted-foreground text-xs leading-4">
                We'll only use this to reply to you.
              </p>
            </form>
          )}
        </Card>
      </div>
    </Section>
  );
}
