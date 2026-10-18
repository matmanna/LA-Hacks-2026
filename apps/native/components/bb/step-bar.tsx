import { cn } from "heroui-native";
import { View } from "react-native";

import { T } from "./t";

// "1 of 2" bar for the two checks after reading: our reading, then your care.
export function StepBar({ step, of = 2 }: { step: number; of?: number }) {
  return (
    <View className="flex-row items-center gap-3 pb-2">
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${step} of ${of}`}
        className="flex-1 flex-row gap-1"
      >
        {Array.from({ length: of }, (_, i) => (
          <View
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed segments
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full",
              i < step ? "bg-ink" : "bg-slate-soft",
            )}
          />
        ))}
      </View>
      <T className="text-[13px] text-muted">
        {step} of {of}
      </T>
    </View>
  );
}
