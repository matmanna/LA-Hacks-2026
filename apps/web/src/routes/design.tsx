import { Badge } from "@betterbill/ui/components/badge";
import { AccountPrompt } from "@betterbill/ui/components/bb/account-prompt";
import { ActivityTimeline } from "@betterbill/ui/components/bb/activity-timeline";
import { ApprovalSheet } from "@betterbill/ui/components/bb/approval-sheet";
import { BalanceCard } from "@betterbill/ui/components/bb/balance-card";
import { CallTranscriptCard } from "@betterbill/ui/components/bb/call-transcript-card";
import {
  ComparePending,
  ComparePriceBar,
} from "@betterbill/ui/components/bb/compare-price-bar";
import { FlagRow } from "@betterbill/ui/components/bb/flag-row";
import { Money } from "@betterbill/ui/components/bb/money";
import { SavingsBar } from "@betterbill/ui/components/bb/savings-bar";
import {
  AuditingState,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@betterbill/ui/components/bb/states";
import { TierBadge } from "@betterbill/ui/components/bb/tier-badge";
import { UploadPanel } from "@betterbill/ui/components/bb/upload-panel";
import { Button } from "@betterbill/ui/components/button";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@betterbill/ui/components/card";
import { Input } from "@betterbill/ui/components/input";
import { Label } from "@betterbill/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@betterbill/ui/components/sheet";
import { Textarea } from "@betterbill/ui/components/textarea";
import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import { sampleCase } from "@/fixtures/sample-case";

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "BetterBill design gallery" },
    ],
  }),
  component: DesignPage,
});

const SWATCHES: { token: string; hex: string; className: string }[] = [
  { token: "background", hex: "#FFFFFF", className: "bg-background" },
  { token: "foreground", hex: "#0B1B2B", className: "bg-foreground" },
  { token: "card", hex: "#FFFFFF", className: "bg-card" },
  { token: "muted", hex: "#F4F6FA", className: "bg-muted" },
  {
    token: "muted-foreground",
    hex: "#5B6B7C",
    className: "bg-muted-foreground",
  },
  { token: "border", hex: "#E3E8EF", className: "bg-border" },
  { token: "primary", hex: "#1E4ED8", className: "bg-primary" },
  { token: "secondary", hex: "#EEF2FF", className: "bg-secondary" },
  {
    token: "secondary-foreground",
    hex: "#1E3A8A",
    className: "bg-secondary-foreground",
  },
  { token: "destructive", hex: "#E5484D", className: "bg-destructive" },
  { token: "ring", hex: "#1E4ED8", className: "bg-ring" },
  { token: "ink", hex: "#0B1B2B", className: "bg-ink" },
  { token: "mint", hex: "#0F9D76", className: "bg-mint" },
  { token: "mint-soft", hex: "#D1FAE5", className: "bg-mint-soft" },
  { token: "mint-ink", hex: "#065F46", className: "bg-mint-ink" },
  { token: "coral-soft", hex: "#FDECEC", className: "bg-coral-soft" },
  { token: "coral-ink", hex: "#B4232A", className: "bg-coral-ink" },
  { token: "amber-soft", hex: "#FEF3C7", className: "bg-amber-soft" },
  { token: "amber-ink", hex: "#92400E", className: "bg-amber-ink" },
  { token: "slate-soft", hex: "#EEF2F6", className: "bg-slate-soft" },
  { token: "slate-ink", hex: "#334155", className: "bg-slate-ink" },
];

const TYPE_SCALE: { label: string; className: string }[] = [
  {
    label: "Display",
    className:
      "font-serif text-[40px] leading-[44px] tracking-[-0.01em] lg:text-[64px] lg:leading-[68px]",
  },
  {
    label: "H1",
    className:
      "text-[28px] leading-[34px] font-semibold tracking-[-0.01em] lg:text-[36px] lg:leading-[42px]",
  },
  { label: "H2", className: "text-[22px] leading-[28px] font-semibold" },
  { label: "H3", className: "text-lg leading-6 font-semibold" },
  { label: "Body", className: "text-base leading-6" },
  { label: "Small", className: "text-sm leading-5" },
  { label: "Caption", className: "text-xs leading-4 text-muted-foreground" },
  {
    label: "Eyebrow",
    className:
      "text-xs leading-4 font-medium uppercase tracking-[0.08em] text-muted-foreground",
  },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-semibold text-[22px] leading-[28px]">{title}</h2>
      {children}
    </section>
  );
}

const SAMPLE_LETTER = `To the billing office,

I'm writing about my statement. The line "CBC with differential" (85025) appears twice on the same date. Can you confirm I received the test twice?

I'd also like to understand the MRI charge compared with your published price list. Please send an itemized bill and your reply in writing.

Thank you.`;

function DesignPage() {
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  return (
    <main className="mx-auto max-w-6xl space-y-12 px-5 py-10 md:px-8">
      <h1 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em] lg:text-[36px] lg:leading-[42px]">
        BetterBill design gallery
      </h1>

      <Section title="Color">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {SWATCHES.map((s) => (
            <li key={s.token} className="space-y-2">
              <div className={`size-16 rounded-xl border ${s.className}`} />
              <p className="font-medium text-xs leading-4">{s.token}</p>
              <p className="text-muted-foreground text-xs leading-4">{s.hex}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type">
        <div className="space-y-4">
          {TYPE_SCALE.map((t) => (
            <div key={t.label} className="border-b pb-4">
              <p className="mb-1 text-muted-foreground text-xs leading-4">
                {t.label}
              </p>
              <p className={t.className}>Your hospital bill, checked.</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Money">
        <ul className="space-y-2 text-[22px] leading-[28px]">
          <li>
            <Money cents={125037} />
          </li>
          <li data-testid="money-negative">
            <Money cents={-102247} sign="auto" />
          </li>
          <li>
            <Money cents={8400} cents_display="hide" label="Duplicate charge" />
          </li>
          <li>
            <Money cents={1200000} />
          </li>
        </ul>
      </Section>

      <Section title="Tiers">
        <div className="flex flex-wrap gap-2">
          <TierBadge tier="confirmed" />
          <TierBadge tier="rule" />
          <TierBadge tier="published" />
          <TierBadge tier="estimate" />
        </div>
      </Section>

      <Section title="Balance card">
        <div className="grid gap-4 md:grid-cols-3">
          <BalanceCard
            hospitalName={sampleCase.hospital.name}
            {...sampleCase.summary}
          />
          <BalanceCard
            hospitalName={sampleCase.hospital.name}
            billedCents={sampleCase.summary.billedCents}
            fairBalanceCents={sampleCase.summary.billedCents}
            lessThanBilledCents={0}
            isEstimate={false}
          />
          <BalanceCard
            hospitalName={sampleCase.hospital.name}
            {...sampleCase.summary}
            loading
          />
        </div>
        <p className="text-muted-foreground text-xs leading-4">
          Sample bill. Synthetic data. Placeholder values until audit output
          replaces them.
        </p>
      </Section>

      <Section title="Flag rows">
        <div className="max-w-xl rounded-2xl border bg-card p-2 shadow-card">
          {sampleCase.flags.map((flag) => (
            <FlagRow
              key={flag.id}
              flag={flag}
              amountPrefix={flag.tier === "published" ? "up_to" : "none"}
              onOpen={() => {}}
            />
          ))}
        </div>
      </Section>

      <Section title="Compare price bar">
        <div className="grid max-w-3xl gap-6 md:grid-cols-2">
          <ComparePriceBar
            billedCents={690000}
            publishedCents={400000}
            sourceName="Sample hospital"
            sourceUrl="https://example.com/price-file"
            capturedAt="2026-10-17T23:00:00.000Z"
          />
          <ComparePending />
        </div>
        <p className="text-muted-foreground text-xs leading-4">
          Sample values. Synthetic data. The captured price comes from the
          hospital price file with its date.
        </p>
      </Section>

      <Section title="Upload panel">
        <div className="max-w-md">
          <UploadPanel
            onPhotos={() => {}}
            onText={() => {}}
            onSample={() => {}}
          />
        </div>
      </Section>

      <Section title="States">
        <div className="grid gap-4 md:grid-cols-2">
          <LoadingState />
          <AuditingState />
          <EmptyState
            title="Nothing looks wrong"
            body="We checked 23 lines and found nothing to flag. You can still ask for an itemized bill."
            action={{ label: "Ask for an itemized bill", onClick: () => {} }}
          />
          <ErrorState
            title="We couldn't read this photo"
            body="Try a flatter, brighter photo, or paste the text instead."
            action={{ label: "Retake photo", onClick: () => {} }}
            secondary={{ label: "Paste the text", onClick: () => {} }}
          />
        </div>
      </Section>

      <Section title="Approval and account">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setApprovalOpen(true)}>
            Open approval sheet
          </Button>
          <Button variant="secondary" onClick={() => setAccountOpen(true)}>
            Open account prompt
          </Button>
        </div>
        <p className="text-muted-foreground text-xs leading-4">
          Sample letter text. Synthetic data.
        </p>
        <ApprovalSheet
          open={approvalOpen}
          onOpenChange={setApprovalOpen}
          kind="letter"
          recipient="Billing office, Sample General Hospital"
          channelDetail="Test inbox, not a real hospital"
          text={SAMPLE_LETTER}
          dataShared={["Your name", "Account ending 0000", "2 disputed lines"]}
          onApprove={() => setApprovalOpen(false)}
          paidPlanAgreement={{ checked: true, onCheckedChange: () => {} }}
        />
        <AccountPrompt
          open={accountOpen}
          onOpenChange={setAccountOpen}
          onCreate={() => setAccountOpen(false)}
          onSignIn={() => setAccountOpen(false)}
        />
      </Section>

      <Section title="Activity and call">
        <div className="grid gap-6 md:grid-cols-2">
          <ActivityTimeline
            current={{
              title: "Waiting for the billing office",
              detail: "Sample step. Synthetic data.",
              icon: "phone",
            }}
            events={[
              {
                id: "e1",
                at: "2026-10-17T23:02:00.000Z",
                summary: "Bill checked",
                actor: "system",
                done: true,
              },
              {
                id: "e2",
                at: "2026-10-17T23:10:00.000Z",
                summary: "Letter approved",
                actor: "user",
                done: true,
              },
              {
                id: "e3",
                at: "2026-10-17T23:11:00.000Z",
                summary: "Letter sent",
                actor: "agent",
                done: true,
              },
              {
                id: "e4",
                at: "2026-10-18T16:00:00.000Z",
                summary: "Reply received",
                actor: "system",
                done: false,
              },
            ]}
          />
          <CallTranscriptCard
            status="ended"
            recorded
            turns={[
              {
                speaker: "agent",
                text: "Hi, this is an automated assistant calling on behalf of a patient.",
              },
              { speaker: "billing", text: "Sample reply. Synthetic data." },
            ]}
            outcome={{
              referenceNumber: "SAMPLE-0000",
              nextStep: "Sample next step",
              followUpBy: "Sample date",
            }}
          />
        </div>
      </Section>

      <Section title="Savings bar">
        <SavingsBar
          {...sampleCase.savings}
          actionLabel="Send the letter"
          onAction={() => {}}
          className="relative inset-auto lg:block"
        />
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Check my bill</Button>
          <Button variant="secondary">Try a sample bill</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Flagged</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="design-name">Name</Label>
            <Input id="design-name" placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="design-text">Bill text</Label>
            <Textarea
              id="design-text"
              placeholder="Paste the text from your bill or patient portal"
            />
          </div>
        </div>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <CardTitle>Card title</CardTitle>
          <CardDescription>One shadow, one radius, one border.</CardDescription>
        </Card>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Flagged</Badge>
        </div>
      </Section>

      <Section title="Sheet">
        <Sheet>
          <SheetTrigger render={<Button variant="secondary" />}>
            Open sheet
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Sample sheet</SheetTitle>
              <SheetDescription>
                Sample text. Bottom sheets slide in over 250 ms.
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </Section>
    </main>
  );
}
