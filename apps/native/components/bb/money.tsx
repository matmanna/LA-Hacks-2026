import { formatWholeDollars, moneyParts } from "@betterbill/core/money";
import { View } from "react-native";

import { T, type Weight } from "./t";

type Props = {
  cents: number;
  size?: number;
  weight?: Weight;
  className?: string;
  // Context for screen readers, e.g. "Duplicate charge".
  label?: string;
  // Nearest whole dollar, no cents: for prices read at a glance.
  whole?: boolean;
};

// Integer cents in, "$2,609.37" out with the cents raised (section 8.2).
// Display only: amounts always come from the server's audit.
export function Money({
  cents,
  size = 15,
  weight = "medium",
  className,
  label,
  whole = false,
}: Props) {
  const p = moneyParts(cents);
  if (whole) {
    const text = formatWholeDollars(cents);
    const said = `about ${text.replace(/[^0-9,−]/g, "").replace("−", "minus ")} dollars`;
    return (
      <T
        weight={weight}
        className={className}
        accessibilityLabel={label ? `${label}, ${said}` : said}
        style={{
          fontSize: size,
          lineHeight: Math.round(size * 1.2),
          fontVariant: ["tabular-nums"],
        }}
      >
        {text}
      </T>
    );
  }
  const spoken = `${p.sign ? "minus " : ""}${p.dollars} dollars${p.cents === "00" ? "" : ` ${p.cents} cents`}`;
  return (
    <View
      className="flex-row items-start"
      accessible
      accessibilityLabel={label ? `${label}, ${spoken}` : spoken}
    >
      <T
        weight={weight}
        className={className}
        style={{
          fontSize: size,
          lineHeight: Math.round(size * 1.2),
          fontVariant: ["tabular-nums"],
        }}
      >
        {`${p.sign}$${p.dollars}`}
      </T>
      <T
        weight={weight}
        className={className}
        style={{
          fontSize: Math.round(size * 0.55),
          lineHeight: Math.round(size * 0.8),
          marginLeft: 1,
          fontVariant: ["tabular-nums"],
        }}
      >
        {`.${p.cents}`}
      </T>
    </View>
  );
}
