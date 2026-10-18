import { View } from "react-native";

import { Icon } from "./icon";
import { LEVEL_COLORS } from "./price-map-shared";
import { T } from "./t";

// A hospital on the Prices map: a round marker with a short name under it.
// `strong` marks the one the patient picked or that leads a comparison.
export function HospitalPin({
  name,
  strong = false,
  level = null,
}: {
  name: string;
  strong?: boolean;
  // Colours the marker green to red; white when unknown.
  level?: "lower" | "middle" | "higher" | null;
}) {
  const fill = strong
    ? "#0B1B2B"
    : level
      ? LEVEL_COLORS[level].solid
      : "#FFFFFF";
  return (
    <View className="items-center gap-[3px]">
      <View
        className="size-[30px] items-center justify-center rounded-full border-2 border-white"
        style={{
          backgroundColor: fill,
          shadowColor: "#0B1B2B",
          shadowOpacity: 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <Icon
          name="landmark"
          size={16}
          color={fill === "#FFFFFF" ? "#1E3A8A" : "#FFFFFF"}
          stroke={2}
        />
      </View>
      <View className="rounded-full bg-white/90 px-[7px] py-[3px]">
        <T weight="semibold" className="text-[11px] leading-[13px]">
          {name}
        </T>
      </View>
    </View>
  );
}
