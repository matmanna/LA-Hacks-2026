import { cn } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";

import { T } from "./t";

type Props = {
  label: string;
  value: ReactNode;
  last?: boolean;
  strong?: boolean;
};

// Label on the left, value on the right, hairline under it: the row used for
// facts and sources across the Paper frames.
export function Row({ label, value, last = false, strong = false }: Props) {
  return (
    <View
      className={cn(
        "flex-row items-center justify-between gap-4 py-3.5",
        !last && "border-hairline border-b",
      )}
    >
      <T
        weight={strong ? "semibold" : "regular"}
        className={cn("shrink-0 text-[15px]", !strong && "text-muted")}
      >
        {label}
      </T>
      {typeof value === "string" ? (
        <T
          weight={strong ? "semibold" : "medium"}
          className="shrink text-right text-[15px]"
        >
          {value}
        </T>
      ) : (
        value
      )}
    </View>
  );
}
