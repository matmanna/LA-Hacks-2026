import { Button } from "@betterbill/ui/components/button";
import { Card, CardTitle } from "@betterbill/ui/components/card";
import { Checkbox } from "@betterbill/ui/components/checkbox";
import { FileText, Phone } from "lucide-react";
import { useState } from "react";

type BillingChecklistProps = {
  billKind: "itemized" | "summary";
  flagsCount: number;
  itemizedRequested: boolean;
  reviewSent: boolean;
  callStarted: boolean;
  requestBusy: boolean;
  onRequestItemized: () => void;
};

type CheckItem = { id: string; label: string; done?: boolean };

function Checklist({
  items,
  onToggle,
}: {
  items: CheckItem[];
  onToggle: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          {/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox renders the input */}
          <label className="flex min-h-11 items-start gap-3 rounded-xl px-2 py-2 text-sm leading-5 hover:bg-muted">
            <Checkbox
              className="mt-0.5"
              checked={item.done}
              onCheckedChange={() => onToggle(item.id)}
            />
            <span
              className={item.done ? "text-muted-foreground line-through" : ""}
            >
              {item.label}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export function BillingChecklist({
  billKind,
  flagsCount,
  itemizedRequested,
  reviewSent,
  callStarted,
  requestBusy,
  onRequestItemized,
}: BillingChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const toggle = (id: string) =>
    setChecked((current) => ({ ...current, [id]: !current[id] }));
  const itemizedFirst = billKind === "summary";

  const firstSteps: CheckItem[] = itemizedFirst
    ? [
        {
          id: "request",
          label: "Request a complete itemized bill",
          done: itemizedRequested,
        },
        {
          id: "reply",
          label: "Wait for the hospital's itemized reply",
          done: checked.reply,
        },
        {
          id: "review",
          label: "Review every line before discussing the balance",
          done: checked.review,
        },
      ]
    : [
        {
          id: "confirm",
          label: "Confirm the itemized lines we read",
          done: checked.confirm,
        },
        {
          id: "evidence",
          label: `Review the evidence for ${flagsCount} ${flagsCount === 1 ? "flag" : "flags"}`,
          done: checked.evidence,
        },
      ];

  const nextSteps: CheckItem[] = [
    {
      id: "written-review",
      label: "Send a written request to review the charges",
      done: reviewSent,
    },
    {
      id: "call",
      label: "Call the billing office after reviewing the evidence",
      done: callStarted,
    },
  ];

  return (
    <Card className="space-y-5">
      <div>
        <CardTitle>
          {itemizedFirst
            ? "Start with the full bill"
            : "Your billing checklist"}
        </CardTitle>
        <p className="mt-1 text-muted-foreground text-sm leading-5">
          {itemizedFirst
            ? "This statement is not itemized yet. Get the line-by-line bill before negotiating a balance."
            : "Work through the evidence first, then choose a written request or a call."}
        </p>
      </div>

      <section aria-labelledby="bill-first-heading" className="space-y-2">
        <h3 id="bill-first-heading" className="font-semibold text-sm leading-5">
          {itemizedFirst ? "Itemized bill" : "Review"}
        </h3>
        <Checklist items={firstSteps} onToggle={toggle} />
        {itemizedFirst ? (
          <Button
            className="w-full"
            onClick={onRequestItemized}
            disabled={requestBusy || itemizedRequested}
          >
            <FileText aria-hidden="true" />
            {itemizedRequested ? "Request sent" : "Request an itemized bill"}
          </Button>
        ) : null}
      </section>

      <section
        aria-labelledby="billing-office-heading"
        className="space-y-2 border-t pt-4"
      >
        <h3
          id="billing-office-heading"
          className="font-semibold text-sm leading-5"
        >
          {itemizedFirst ? "After it arrives" : "Discuss with billing"}
        </h3>
        {itemizedFirst ? (
          <p className="text-muted-foreground text-sm leading-5">
            Negotiation actions unlock after you have an itemized bill to
            review.
          </p>
        ) : (
          <Checklist items={nextSteps} onToggle={toggle} />
        )}
        {!itemizedFirst ? (
          <div className="flex gap-2 text-muted-foreground text-xs leading-4">
            <Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Nothing is sent or called until you read and approve it.
            </span>
          </div>
        ) : null}
      </section>
    </Card>
  );
}
