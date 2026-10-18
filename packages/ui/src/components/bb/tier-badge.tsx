import { cn } from "@betterbill/ui/lib/utils";
import {
  BadgeCheck,
  BookOpen,
  CircleDashed,
  Landmark,
  MessageSquareQuote,
} from "lucide-react";

export type Tier = "confirmed" | "rule" | "published" | "estimate" | "reported";

type TierBadgeProps = {
  tier: Tier;
  size?: "sm" | "md";
  className?: string;
};

export const TIER_LABELS: Record<Tier, string> = {
  confirmed: "Confirmed from your bill",
  rule: "Billing rule",
  published: "Hospital's published price",
  estimate: "Estimate",
  reported: "You told us",
};

const TIERS = {
  confirmed: { className: "bg-mint-soft text-mint-ink", Icon: BadgeCheck },
  rule: { className: "bg-slate-soft text-slate-ink", Icon: BookOpen },
  published: {
    className: "bg-secondary text-secondary-foreground",
    Icon: Landmark,
  },
  estimate: { className: "bg-amber-soft text-amber-ink", Icon: CircleDashed },
  reported: {
    className: "bg-slate-soft text-slate-ink",
    Icon: MessageSquareQuote,
  },
} as const;

export function TierBadge({ tier, size = "md", className }: TierBadgeProps) {
  const { className: tone, Icon } = TIERS[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 font-medium text-xs",
        size === "sm" && "py-0.5",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} aria-hidden="true" />
      {TIER_LABELS[tier]}
    </span>
  );
}
