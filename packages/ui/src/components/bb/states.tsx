import { Button } from "@betterbill/ui/components/button";
import { Skeleton } from "@betterbill/ui/components/skeleton";
import { cn } from "@betterbill/ui/lib/utils";
import { Check, CircleAlert, LoaderCircle, SearchCheck } from "lucide-react";
import type { ReactNode } from "react";

import { BalanceCard } from "./balance-card";

type StateAction = { label: string; onClick: () => void };

type StateProps = {
  title: string;
  body: string;
  action?: StateAction;
  secondary?: StateAction;
  className?: string;
  children?: ReactNode;
};

function StateShell({
  tone,
  icon,
  title,
  body,
  action,
  secondary,
  className,
  children,
}: StateProps & { tone: string; icon: ReactNode }) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-sm flex-col items-center gap-3 py-12 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full",
          tone,
        )}
      >
        {icon}
      </div>
      <h2 className="font-semibold text-lg leading-6">{title}</h2>
      <p className="text-base text-muted-foreground leading-6">{body}</p>
      {children}
      {action ? (
        <Button className="w-full sm:w-auto" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
      {secondary ? (
        <Button
          variant="ghost"
          className="w-full sm:w-auto"
          onClick={secondary.onClick}
        >
          {secondary.label}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return (
    <StateShell
      {...props}
      tone="bg-mint-soft text-mint-ink"
      icon={<Check className="size-6" strokeWidth={1.75} aria-hidden="true" />}
    />
  );
}

export function ErrorState(props: StateProps) {
  return (
    <StateShell
      {...props}
      tone="bg-coral-soft text-coral-ink"
      icon={
        <CircleAlert className="size-6" strokeWidth={1.75} aria-hidden="true" />
      }
    />
  );
}

const READING_STEPS = [
  "Finding line items",
  "Checking the totals",
  "Getting lines ready for you",
];

export function LoadingState({
  title = "Reading your bill",
  body = "We'll show you every line before checking anything.",
  steps = READING_STEPS,
  className,
}: Partial<Pick<StateProps, "title" | "body" | "className">> & {
  steps?: string[];
}) {
  return (
    <StateShell
      title={title}
      body={body}
      className={className}
      tone="bg-secondary text-secondary-foreground"
      icon={
        <LoaderCircle
          className="size-6 animate-spin motion-reduce:animate-none"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      }
    >
      <p className="sr-only" role="status">
        {title}
      </p>
      {steps.length > 0 ? (
        <ul className="space-y-2 text-left text-sm leading-5">
          {steps.map((step) => (
            <li key={step} className="flex items-center gap-2">
              <Check
                className="size-4 text-mint-ink"
                strokeWidth={2}
                aria-hidden="true"
              />
              {step}
            </li>
          ))}
        </ul>
      ) : null}
    </StateShell>
  );
}

export function AuditingState() {
  return (
    <StateShell
      title="Checking your lines"
      body="Looking for duplicates, unit errors, and mismatches."
      tone="bg-secondary text-secondary-foreground"
      icon={
        <SearchCheck className="size-6" strokeWidth={1.75} aria-hidden="true" />
      }
    />
  );
}

export function CaseSkeleton() {
  return (
    <div className="space-y-6">
      <BalanceCard
        hospitalName=""
        billedCents={0}
        fairBalanceCents={0}
        lessThanBilledCents={0}
        isEstimate={false}
        loading
      />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}
