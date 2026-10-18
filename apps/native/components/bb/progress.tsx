import { cn } from "heroui-native";
import { View } from "react-native";

// The 4-segment bar on the ink cards: checked, approved, contacted, resolved.
export function Progress({ step, label }: { step: number; label: string }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      className="flex-row gap-1"
    >
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full",
            i < step ? "bg-mint" : i === step ? "bg-mint/45" : "bg-white/15",
          )}
        />
      ))}
    </View>
  );
}
