import { cn } from "heroui-native";
import { Pressable } from "react-native";

import { Icon } from "./icon";
import { T } from "./t";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  className?: string;
};

// One answer in a set of choices (F1, F3): a 48 px outlined row, a thicker
// ink border and a check when selected.
export function Choice({ label, selected, onPress, className }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={cn(
        "min-h-12 flex-row items-center justify-between rounded-[14px] bg-white px-4",
        selected ? "border-2 border-ink" : "border border-[#D5DAE1]",
        className,
      )}
    >
      <T
        weight={selected ? "semibold" : "regular"}
        className="text-base"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {label}
      </T>
      {selected ? <Icon name="check" size={18} stroke={2.25} /> : null}
    </Pressable>
  );
}
