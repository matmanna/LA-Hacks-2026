import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { cn } from "heroui-native";
import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "./icon";
import { T } from "./t";

type Props = {
  children: ReactNode;
  // "back" and "close" draw the round 44 px button from the Paper frames.
  nav?: "back" | "close" | null;
  onNav?: () => void;
  // Small label on the right of the top bar, e.g. "Sample bill".
  aside?: string;
  // An extra control on the right of the top bar, e.g. Share.
  action?: ReactNode;
  // Pinned under the content: the screen's one primary action.
  footer?: ReactNode;
  scroll?: boolean;
  tone?: "white" | "wash" | "ink";
  // False under a navigator header (the tabs), which already pads the top.
  insetTop?: boolean;
  className?: string;
};

const BG = { white: "bg-background", wash: "bg-wash", ink: "bg-ink" } as const;

export function Screen({
  children,
  nav = "back",
  onNav,
  aside,
  action,
  footer,
  scroll = true,
  tone = "white",
  insetTop = true,
  className,
}: Props) {
  const insets = useSafeAreaInsets();
  const dark = tone === "ink";
  const body = cn("px-5", className);
  return (
    <View
      className={cn("flex-1", BG[tone])}
      style={{ paddingTop: insetTop ? insets.top : 0 }}
    >
      <StatusBar style={dark ? "light" : "dark"} />
      {nav || aside || action ? (
        <View className="relative h-14 flex-row items-center justify-between px-5">
          {nav ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={nav === "back" ? "Back" : "Close"}
              onPress={onNav ?? (() => router.back())}
              className={cn(
                "size-11 items-center justify-center rounded-full",
                dark ? "bg-ink-soft" : tone === "wash" ? "bg-white" : "bg-wash",
              )}
            >
              <Icon name={nav} color={dark ? "#FFFFFF" : "#0B1B2B"} />
            </Pressable>
          ) : (
            <View />
          )}
          <View
            className="absolute inset-0 items-center justify-center"
            pointerEvents="none"
          >
            <View className="flex-row items-baseline gap-1">
              <T weight="serif" className="text-[22px] leading-none">
                BetterBill
              </T>
              <Icon name="check" size={15} color="#0F9D76" stroke={2} />
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            {aside ? (
              <T
                className={cn(
                  "text-[13px]",
                  dark ? "text-ink-muted" : "text-muted",
                )}
              >
                {aside}
              </T>
            ) : null}
            {action}
          </View>
        </View>
      ) : null}
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={cn(body, "pb-6")}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View className={cn("flex-1", body)}>{children}</View>
      )}
      {footer ? (
        <View
          className="gap-1 px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

// The footer line every result screen carries (section 8.6).
export function Disclaimer() {
  return (
    <T className="text-center text-muted text-xs leading-4">
      BetterBill is informational, not legal or medical advice.
    </T>
  );
}
