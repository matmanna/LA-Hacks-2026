import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from "@expo-google-fonts/geist";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif";
import { cn } from "heroui-native";
import { Text, type TextProps } from "react-native";

// React Native picks a font file per weight, so each weight is its own family.
// Every text sets one explicitly: nothing inherits a font from its parent.
export const FONTS = {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  InstrumentSerif_400Regular,
};

const FAMILY = {
  regular: "Geist_400Regular",
  medium: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
  serif: "InstrumentSerif_400Regular",
} as const;

export type Weight = keyof typeof FAMILY;

type Props = TextProps & { weight?: Weight; className?: string };

export function T({ weight = "regular", className, style, ...props }: Props) {
  return (
    <Text
      className={cn("text-foreground", className)}
      style={[{ fontFamily: FAMILY[weight] }, style]}
      {...props}
    />
  );
}
