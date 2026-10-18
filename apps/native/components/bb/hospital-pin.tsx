import { View } from "react-native";

import { Icon } from "./icon";
import { T } from "./t";

// A hospital on the Prices map: a round marker with a short name under it.
// `strong` marks the one the patient picked or that leads a comparison.
export function HospitalPin({
  name,
  strong = false,
}: {
  name: string;
  strong?: boolean;
}) {
  return (
    <View className="items-center gap-[3px]">
      <View
        className={
          strong
            ? "size-[30px] items-center justify-center rounded-full bg-ink"
            : "size-[30px] items-center justify-center rounded-full bg-white"
        }
        style={{
          shadowColor: "#0B1B2B",
          shadowOpacity: 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <Icon
          name="landmark"
          size={16}
          color={strong ? "#FFFFFF" : "#1E3A8A"}
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
