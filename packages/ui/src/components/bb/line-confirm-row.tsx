import { Button } from "@betterbill/ui/components/button";
import { Input } from "@betterbill/ui/components/input";
import { Label } from "@betterbill/ui/components/label";
import { cn } from "@betterbill/ui/lib/utils";
import { FileText, Pencil } from "lucide-react";
import { useState } from "react";

import { Money } from "./money";

type ConfirmLine = {
  id: string;
  serviceDate: string | null;
  description: string;
  code: string | null;
  units: number;
  chargeCents: number;
  confidence: number;
  userEdited: boolean;
};

type LineConfirmRowProps<L extends ConfirmLine> = {
  line: L;
  cropUrl?: string;
  onChange: (next: L) => void;
  editing: boolean;
  onEditToggle: () => void;
  className?: string;
};

function confidence(value: number) {
  if (value >= 0.9) return { dot: "bg-mint", label: "High confidence" };
  if (value >= 0.7) return { dot: "bg-amber-ink", label: "Check this line" };
  return { dot: "bg-destructive", label: "Low confidence, please check" };
}

export function LineConfirmRow<L extends ConfirmLine>({
  line,
  cropUrl,
  onChange,
  editing,
  onEditToggle,
  className,
}: LineConfirmRowProps<L>) {
  const [draft, setDraft] = useState({
    description: line.description,
    code: line.code ?? "",
    units: String(line.units),
    charge: (line.chargeCents / 100).toFixed(2),
  });
  const level = confidence(line.confidence);

  function save() {
    // Input parsing for the edited field, not savings math.
    const cents = Math.round(Number.parseFloat(draft.charge) * 100);
    const units = Number.parseFloat(draft.units);
    onChange({
      ...line,
      description: draft.description.trim() || line.description,
      code: draft.code.trim() || null,
      units: Number.isFinite(units) && units > 0 ? units : line.units,
      chargeCents:
        Number.isFinite(cents) && cents >= 0 ? cents : line.chargeCents,
      userEdited: true,
    });
    onEditToggle();
  }

  if (editing) {
    return (
      <div
        data-sentry-block
        className={cn(
          "rounded-xl border bg-card p-3 ring-2 ring-ring",
          className,
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${line.id}-desc`}>Description</Label>
            <Input
              id={`${line.id}-desc`}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${line.id}-code`}>Code</Label>
            <Input
              id={`${line.id}-code`}
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${line.id}-units`}>Units</Label>
            <Input
              id={`${line.id}-units`}
              inputMode="decimal"
              value={draft.units}
              onChange={(e) => setDraft({ ...draft, units: e.target.value })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${line.id}-charge`}>Charge ($)</Label>
            <Input
              id={`${line.id}-charge`}
              inputMode="decimal"
              value={draft.charge}
              onChange={(e) => setDraft({ ...draft, charge: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={save}>Save</Button>
          <Button variant="ghost" onClick={onEditToggle}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-sentry-block
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-card p-3",
        className,
      )}
    >
      {cropUrl ? (
        <img
          src={cropUrl}
          alt=""
          className="h-10 w-14 shrink-0 rounded-md border object-cover"
        />
      ) : (
        <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
          <FileText className="size-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-medium text-sm leading-5">
          {line.description}
        </p>
        <p className="text-muted-foreground text-xs leading-4">
          {[
            line.code,
            line.serviceDate,
            `${line.units} unit${line.units === 1 ? "" : "s"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {line.confidence < 0.7 ? (
          <p className="text-amber-ink text-xs leading-4">
            Please check this line.
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="flex items-center gap-2">
          <span
            className={cn("size-2 rounded-full", level.dot)}
            aria-hidden="true"
          />
          <span className="sr-only">{level.label}</span>
          <Money cents={line.chargeCents} className="font-semibold text-sm" />
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit line: ${line.description}`}
          onClick={onEditToggle}
        >
          <Pencil className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
