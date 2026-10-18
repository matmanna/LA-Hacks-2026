import type { Tier } from "@betterbill/core";
import { View } from "react-native";

import { Icon, type IconName } from "./icon";
import { T } from "./t";

export const TIER_LABELS: Record<Tier, string> = {
  confirmed: "Confirmed from your bill",
  rule: "Billing rule",
  published: "Hospital's published price",
  estimate: "Estimate",
  reported: "You told us",
};

// Icon plus label, never color alone (section 8.1).
const TIERS: Record<Tier, { icon: IconName; ink: string; text: string }> = {
  confirmed: { icon: "badgeCheck", ink: "#065F46", text: "text-mint-ink" },
  rule: { icon: "book", ink: "#334155", text: "text-slate-ink" },
  published: { icon: "landmark", ink: "#1E3A8A", text: "text-secondary-ink" },
  estimate: { icon: "circleDashed", ink: "#92400E", text: "text-amber-ink" },
  reported: { icon: "user", ink: "#334155", text: "text-slate-ink" },
};

// The quiet inline form used under flag titles in the Paper frames.
export function TierBadge({ tier }: { tier: Tier }) {
  const t = TIERS[tier];
  return (
    <View className="flex-row items-center gap-1">
      <Icon name={t.icon} size={14} color={t.ink} stroke={2} />
      <T className={`text-xs ${t.text}`}>{TIER_LABELS[tier]}</T>
    </View>
  );
}
