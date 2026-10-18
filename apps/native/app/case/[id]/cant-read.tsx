import { router } from "expo-router";
import { View } from "react-native";

import { Button, Icon, Screen, T } from "@/components/bb";

const TIPS = [
  "Fit all four corners and the totals",
  "Use more light, no flash glare",
  "Lay the page flat and hold still",
];

// E2: the photo could not be read. Nothing was saved from it.
export default function CantRead() {
  return (
    <Screen
      nav="close"
      onNav={() => router.replace("/")}
      footer={
        <>
          <Button
            label="Retake photo"
            onPress={() => router.replace("/scan")}
          />
          <Button
            label="Paste the text instead"
            variant="quiet"
            onPress={() => router.replace("/paste")}
          />
        </>
      }
    >
      <View className="items-center pt-4">
        <View className="h-[220px] w-[180px]">
          <View
            className="h-[210px] w-[160px] gap-2 rounded-md bg-paper px-3.5 py-4 opacity-60"
            style={{ transform: [{ rotate: "-4deg" }] }}
          >
            <View className="h-[7px] w-[70%] rounded-sm bg-[#2A3440]" />
            {[100, 85, 100, 60, 100, 75].map((w, i) => (
              <View
                // biome-ignore lint/suspicious/noArrayIndexKey: static shape
                key={i}
                className="h-[5px] rounded-sm bg-[#C8D1DC]"
                style={{ width: `${w}%` }}
              />
            ))}
          </View>
          <View
            className="absolute right-0 bottom-1.5 size-[52px] items-center justify-center rounded-full bg-white"
            style={{
              shadowColor: "#0B1B2B",
              shadowOpacity: 0.14,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <Icon name="scanX" size={24} />
          </View>
        </View>
      </View>

      <View className="items-center gap-1.5 pt-6">
        <T
          weight="semibold"
          className="text-center text-[26px] leading-8 tracking-tight"
        >
          We couldn't read this photo
        </T>
        <T className="max-w-[300px] text-center text-[15px] text-muted leading-[22px]">
          It may be blurry, too dark, or cut off. Nothing was saved.
        </T>
      </View>

      <View className="pt-5">
        {TIPS.map((tip, i) => (
          <View
            key={tip}
            className={
              i < TIPS.length - 1
                ? "flex-row items-center gap-3 border-hairline border-b py-[13px]"
                : "flex-row items-center gap-3 py-[13px]"
            }
          >
            <Icon name="check" color="#0F9D76" stroke={2} />
            <T className="text-[15px]">{tip}</T>
          </View>
        ))}
      </View>
    </Screen>
  );
}
