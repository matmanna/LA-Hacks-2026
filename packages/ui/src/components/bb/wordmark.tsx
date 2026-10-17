import { cn } from "@betterbill/ui/lib/utils";

type WordmarkProps = { suffix?: "for plans"; className?: string };

export function Wordmark({ suffix, className }: WordmarkProps) {
  return (
    <span className={cn("inline-flex items-baseline", className)}>
      <span className="font-serif text-2xl text-foreground leading-none">
        BetterBill
      </span>
      <svg
        viewBox="0 0 16 16"
        className="ml-1 size-4 self-center text-mint"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2.5 8.8 6.2 12.4 13.5 3.6" />
      </svg>
      {suffix ? (
        <span className="ml-2 font-sans text-muted-foreground text-sm">
          {suffix}
        </span>
      ) : null}
    </span>
  );
}
