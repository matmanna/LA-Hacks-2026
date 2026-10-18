import { View } from "react-native";

import { LEVEL_COLORS } from "./price-map-shared";
import { T } from "./t";

// The key to the map colours, in words as well as colour.
export function PriceLegend({ kind }: { kind: "price" | "hospital" }) {
  const items =
    kind === "hospital"
      ? ([
          ["lower", "Mostly lower"],
          ["middle", "Mixed"],
          ["higher", "Mostly higher"],
        ] as const)
      : ([
          ["lower", "Lower"],
          ["middle", "Middle"],
          ["higher", "Higher"],
        ] as const);
  return (
    <View
      className="flex-row items-center gap-2.5 self-start rounded-full bg-white px-3 py-1.5"
      style={{
        shadowColor: "#0B1B2B",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
      accessible
      accessibilityLabel={
        kind === "hospital"
          ? "Pin colours: green when a hospital's cash prices are mostly lower than others near you, amber when mixed, red when mostly higher"
          : "Tag colours: green for the lower third of prices near you, amber for the middle, red for the higher third"
      }
    >
      <T weight="semibold" className="text-[11px] text-muted">
        {kind === "hospital" ? "Cash prices" : "Price"}
      </T>
      {items.map(([level, label]) => (
        <View key={level} className="flex-row items-center gap-1">
          <View
            className="size-2.5 rounded-full"
            style={{ backgroundColor: LEVEL_COLORS[level].solid }}
          />
          <T className="text-[11px] text-foreground">{label}</T>
        </View>
      ))}
    </View>
  );
}
