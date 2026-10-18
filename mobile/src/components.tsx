import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { color } from "@/lib/theme";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  busy?: boolean;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  busy,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && { backgroundColor: color.primary },
        variant === "secondary" && { backgroundColor: color.secondary },
        (disabled || busy) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={variant === "primary" ? "#FFFFFF" : color.primary}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            {
              color:
                variant === "primary"
                  ? "#FFFFFF"
                  : variant === "secondary"
                    ? color.secondaryForeground
                    : color.foreground,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Note({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "error";
}) {
  return (
    <Text style={[styles.note, tone === "error" && { color: color.coralInk }]}>
      {children}
    </Text>
  );
}

export const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
  card: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    backgroundColor: color.background,
  },
  note: { fontSize: 13, lineHeight: 18, color: color.mutedForeground },
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    color: color.foreground,
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
    color: color.foreground,
  },
  body: { fontSize: 16, lineHeight: 24, color: color.foreground },
});
