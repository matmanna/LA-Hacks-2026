import type { Line } from "@betterbill/core";
import { moneyParts } from "@betterbill/core/money";
import { cn } from "heroui-native";
import { type StyleProp, View, type ViewStyle } from "react-native";

import { T } from "./t";

export type MockLine = {
  text: string;
  amount: string;
  // "read" outlines in mint, "reading" in cobalt (L2 Reading).
  state?: "read" | "reading";
};

const MONO = { fontFamily: "Courier New" };

// The paper bill drawn in L1 and L2. Synthetic demo content only.
export function BillMock({
  lines,
  size = "sm",
  total,
  className,
  style,
}: {
  lines: MockLine[];
  size?: "sm" | "md";
  total?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const text =
    size === "sm" ? "text-[7px] leading-[9px]" : "text-[9px] leading-[11px]";
  return (
    <View
      className={cn("gap-1.5 rounded bg-paper px-4 py-4", className)}
      style={[
        {
          shadowColor: "#0B1B2B",
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        },
        style,
      ]}
    >
      <T
        weight="semibold"
        className={cn(
          "text-[#2A3440]",
          size === "sm" ? "text-[10px]" : "text-[11px]",
        )}
      >
        CEDARS-SINAI MEDICAL CENTER
      </T>
      {size === "sm" ? (
        <T className={cn("text-[#2A3440]", text)} style={MONO}>
          ITEMIZED STATEMENT · ACCT ****4821
        </T>
      ) : null}
      <View className="h-px bg-[#B8BFC8]" />
      {lines.map((l, i) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: duplicate lines are real
          key={`${l.text}-${i}`}
          className={cn(
            "flex-row justify-between rounded-sm px-0.5",
            l.state === "read" && "border border-mint bg-mint/15",
            l.state === "reading" && "border border-accent bg-accent/10",
          )}
        >
          <T
            className={cn("shrink text-[#2A3440]", text)}
            style={MONO}
            numberOfLines={1}
          >
            {l.text}
          </T>
          <T className={cn("text-[#2A3440]", text)} style={MONO}>
            {l.amount}
          </T>
        </View>
      ))}
      {total ? (
        <>
          <View className="flex-1" />
          <View className="h-px bg-[#B8BFC8]" />
          <View className="flex-row justify-between">
            <T weight="semibold" className={cn("text-[#2A3440]", text)}>
              AMOUNT DUE
            </T>
            <T weight="semibold" className={cn("text-[#2A3440]", text)}>
              {total}
            </T>
          </View>
          <T
            weight="semibold"
            className={cn("text-center text-coral-ink", text)}
          >
            SYNTHETIC DEMO BILL
          </T>
        </>
      ) : null}
    </View>
  );
}

// SB-01 as printed (data/synthetic/bills/SB-01.json), for the L1 preview.
export const SAMPLE_PRINT: MockLine[] = [
  { text: "09/14 99284 ED VISIT LEVEL 4", amount: "2,950.00" },
  { text: "09/14 72148 MRI LUMBAR W/O", amount: "6,900.00" },
  { text: "09/14 72100 XR LUMBAR 2-3V", amount: "640.00" },
  { text: "09/14 85025 CBC W/ AUTO DIFF", amount: "84.00" },
  { text: "09/14 85025 CBC W/ AUTO DIFF", amount: "84.00" },
  { text: "09/14 80053 COMP METABOLIC", amount: "212.00" },
  { text: "09/14 36415 VENIPUNCTURE x4", amount: "152.00" },
  { text: "09/14 96374 IV PUSH SINGLE", amount: "486.00" },
  { text: "09/14 J1885 KETOROLAC 15MG", amount: "96.00" },
  { text: "09/14 J7030 SALINE 1000CC", amount: "186.00" },
  { text: "09/14 81003 URINALYSIS AUTO", amount: "210.00" },
];

// A bill line as it would be printed: "09/14 36415 VENIPUNCTURE x4".
export function printedLine(line: Line): { text: string; amount: string } {
  const d = line.serviceDate?.slice(5).replace("-", "/") ?? "";
  const p = moneyParts(line.chargeCents);
  const units = line.units > 1 ? `x${line.units}` : null;
  return {
    text: [d, line.code, line.description.toUpperCase(), units]
      .filter(Boolean)
      .join(" "),
    amount: `${p.dollars}.${p.cents}`,
  };
}
