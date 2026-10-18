import { cn } from "heroui-native";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { T } from "./t";

type Variant = "primary" | "secondary" | "outline" | "quiet" | "disabled";

const BOX: Record<Variant, string> = {
  primary: "h-12 bg-accent",
  secondary: "h-11 bg-secondary",
  outline: "h-11 border border-hairline",
  quiet: "h-11",
  disabled: "h-12 bg-slate-soft",
};

const LABEL: Record<Variant, string> = {
  primary: "text-base text-white",
  secondary: "text-[15px] text-secondary-ink",
  outline: "text-[15px] text-foreground",
  quiet: "text-[15px] text-accent",
  disabled: "text-base text-muted",
};

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  busy?: boolean;
  icon?: ReactNode;
  className?: string;
};

// One primary action per screen (section 8.3): 48 px, rounded-xl, full width.
export function Button({
  label,
  onPress,
  variant = "primary",
  busy = false,
  icon,
  className,
}: Props) {
  const off = variant === "disabled" || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      className={cn(
        "flex-row items-center justify-center gap-1.5 rounded-xl active:opacity-80",
        BOX[variant],
        className,
      )}
    >
      {busy ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#1E4ED8"} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <T
            weight={variant === "quiet" ? "medium" : "semibold"}
            className={LABEL[variant]}
          >
            {label}
          </T>
        </>
      )}
    </Pressable>
  );
}
