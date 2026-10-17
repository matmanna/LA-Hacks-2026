import { cn } from "@betterbill/ui/lib/utils";

type MoneyProps = {
  cents: number;
  sign?: "none" | "negative" | "auto";
  cents_display?: "sup" | "inline" | "hide";
  label?: string;
  className?: string;
};

const dollarsFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function Money({
  cents,
  sign = "none",
  cents_display = "sup",
  label,
  className,
}: MoneyProps) {
  const negative = sign === "negative" || (sign === "auto" && cents < 0);
  const abs = Math.abs(cents);
  const dollars = Math.trunc(abs / 100);
  const remainder = String(abs % 100).padStart(2, "0");
  const dollarsText = dollarsFormat.format(dollars);

  const spoken = `${negative ? "minus " : ""}${dollarsText} dollars${
    remainder === "00" ? "" : ` and ${Number(remainder)} cents`
  }`;

  return (
    <span
      className={cn("whitespace-nowrap tabular-nums", className)}
      role="img"
      aria-label={label ? `${label}, ${spoken}` : spoken}
    >
      <span aria-hidden="true">
        {negative ? "−" : ""}${dollarsText}
        {cents_display === "sup" ? (
          <sup className="relative top-[0.15em] ml-0.5 align-top text-[0.55em]">
            .{remainder}
          </sup>
        ) : null}
        {cents_display === "inline" ? `.${remainder}` : null}
      </span>
    </span>
  );
}
