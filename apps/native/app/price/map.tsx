import type { NearbyPrice } from "@betterbill/core";
import { SERVICES } from "@betterbill/core/prices/services";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { cn } from "heroui-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Button,
  Disclaimer,
  Icon,
  Money,
  PIN_STEP_MS,
  PriceMap,
  T,
  TierBadge,
} from "@/components/bb";
import { errorMessage } from "@/lib/errors";
import { monthYear } from "@/lib/format";
import { useNearby } from "@/lib/prices";

const SHADOW = {
  shadowColor: "#0B1B2B",
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
};

const openHospital = (hospitalKey: string, code: string) =>
  router.push({
    pathname: "/price/[hospitalKey]",
    params: { hospitalKey, code },
  });

// Price A: the hospitals near you on a map with their published cash price,
// then a sheet with the range and the lowest three. Phones only for the map;
// the web shows the ranked list.
export default function PriceMapScreen() {
  const { code = "" } = useLocalSearchParams<{ code: string }>();
  const service = SERVICES.find((s) => s.code === code);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const nearby = useNearby(code);
  const { origin, data } = nearby;
  const [all, setAll] = useState(Platform.OS === "web");
  const reduced = useReducedMotion();
  const shown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!data) return;
    // On phones the sheet rises once the last pin has popped in.
    const pins = Platform.OS === "web" ? 0 : data.rows.length * PIN_STEP_MS;
    shown.value = reduced
      ? 1
      : withDelay(
          pins + 250,
          withTiming(1, {
            duration: 550,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
          }),
        );
  }, [data, reduced, shown]);
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - shown.value) * 420 }],
  }));

  const header = (
    <View className="gap-3">
      <View className="flex-row items-center gap-2.5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="size-11 items-center justify-center rounded-full bg-white"
          style={SHADOW}
        >
          <Icon name="back" />
        </Pressable>
        <Pressable
          accessibilityRole="search"
          accessibilityLabel={`Change service, now ${service?.name ?? code}`}
          onPress={() => router.push("/price/search")}
          className="h-[50px] flex-1 flex-row items-center gap-2.5 rounded-full bg-white pr-2 pl-4"
          style={SHADOW}
        >
          <Icon name="search" size={18} color="#5B6B7C" stroke={2} />
          <View className="flex-1">
            <T weight="semibold" className="text-[15px]" numberOfLines={1}>
              {service?.short ?? code}
            </T>
            <T className="text-muted text-xs" numberOfLines={1}>
              {`CPT ${code} · near ${origin?.label ?? "you"}`}
            </T>
          </View>
          <View className="h-[34px] justify-center rounded-full bg-wash px-3">
            <T weight="semibold" className="text-[13px]">
              Cash
            </T>
          </View>
        </Pressable>
      </View>
      <View
        className="h-[34px] flex-row items-center gap-2 self-center rounded-full bg-white px-3.5"
        style={SHADOW}
        accessibilityLiveRegion="polite"
      >
        {data ? (
          <>
            <Icon name="check" size={14} color="#0F9D76" stroke={3} />
            <T weight="semibold" className="text-[13px]">
              {`${data.summary.hospitals} ${data.summary.hospitals === 1 ? "hospital" : "hospitals"} checked`}
            </T>
          </>
        ) : nearby.isError ? (
          <T weight="semibold" className="text-[13px] text-coral-ink">
            Couldn't check prices
          </T>
        ) : (
          <>
            <ActivityIndicator size="small" color="#1E4ED8" />
            <T weight="semibold" className="text-[13px]">
              Checking hospitals near you…
            </T>
          </>
        )}
      </View>
    </View>
  );

  const body = nearby.isError ? (
    <View className="gap-3 pt-4">
      <T className="text-coral-ink text-sm leading-5">
        {errorMessage(nearby.error)}
      </T>
      <Button
        label="Try again"
        variant="secondary"
        onPress={() => void nearby.refetch()}
      />
    </View>
  ) : data ? (
    <SheetBody
      rows={data.rows}
      low={data.summary.lowCents}
      high={data.summary.highCents}
      all={all}
      onAll={() => setAll(true)}
      code={code}
    />
  ) : null;

  if (Platform.OS === "web") {
    return (
      <View className="flex-1 bg-wash">
        <StatusBar style="dark" />
        <ScrollView
          contentContainerClassName="gap-4 px-4 pb-8"
          contentContainerStyle={{ paddingTop: insets.top + 14 }}
        >
          {header}
          <View className="rounded-[28px] bg-white px-5 pt-4 pb-5">
            {body ?? <ActivityIndicator className="py-10" color="#1E4ED8" />}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#EEF1F5]">
      <StatusBar style="dark" />
      <View className="absolute inset-0">
        {origin ? (
          <PriceMap
            rows={data?.rows ?? []}
            origin={origin}
            here={origin.here}
            onSelect={(key) => openHospital(key, code)}
            insets={{ top: insets.top + 150, bottom: 400 }}
          />
        ) : null}
      </View>
      <View className="px-4" style={{ paddingTop: insets.top + 14 }}>
        {header}
      </View>
      <Animated.View
        className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white px-5 pt-2.5"
        style={[
          sheetStyle,
          {
            maxHeight: all ? height * 0.82 : undefined,
            paddingBottom: Math.max(insets.bottom, 16) + 6,
            shadowColor: "#0B1B2B",
            shadowOpacity: 0.12,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: -6 },
          },
        ]}
      >
        <View className="h-[5px] w-10 self-center rounded-full bg-[#D5DAE1]" />
        <ScrollView scrollEnabled={all} showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function SheetBody({
  rows,
  low,
  high,
  all,
  onAll,
  code,
}: {
  rows: NearbyPrice[];
  low: number | null;
  high: number | null;
  all: boolean;
  onAll: () => void;
  code: string;
}) {
  if (rows.length === 0) {
    return (
      <View className="gap-1 py-4">
        <T weight="semibold" className="text-base">
          No prices for this service yet
        </T>
        <T className="text-muted text-sm leading-5">
          None of the hospitals we captured list it in their price file.
        </T>
      </View>
    );
  }
  const shown = all ? rows : rows.slice(0, 3);
  return (
    <View className="pt-3.5">
      {low !== null && high !== null ? (
        <View className="gap-1">
          <View className="flex-row items-center gap-1.5">
            <Money cents={low} size={26} weight="semibold" label="Lowest" />
            <T weight="semibold" className="text-[26px] leading-[30px]">
              –
            </T>
            <Money cents={high} size={26} weight="semibold" label="Highest" />
          </View>
          <T className="text-[13px] text-muted">
            Published cash prices near you, lowest first
          </T>
          <TierBadge tier="published" />
        </View>
      ) : null}
      <View className="mt-2">
        {shown.map((r, i) => (
          <PriceRow
            key={r.hospitalKey}
            row={r}
            last={i === shown.length - 1}
            onPress={() => openHospital(r.hospitalKey, code)}
          />
        ))}
      </View>
      {!all && rows.length > 3 ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAll}
          className="min-h-11 justify-center self-start"
        >
          <T weight="semibold" className="text-accent text-sm">
            {`See all ${rows.length} hospitals`}
          </T>
        </Pressable>
      ) : null}
      <View className="gap-1.5 pt-2">
        <T className="text-center text-[11px] text-muted leading-[15px]">
          Published cash prices are the hospital's own fee, an estimate of what
          you'd pay without insurance. Doctors may bill separately.
        </T>
        <Disclaimer />
      </View>
    </View>
  );
}

function PriceRow({
  row,
  last,
  onPress,
}: {
  row: NearbyPrice;
  last: boolean;
  onPress: () => void;
}) {
  const lowest = row.rank === 1;
  const file = monthYear(row.fileUpdatedOn);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 py-[11px]",
        !last && "border-[#EEF0F3] border-b",
      )}
    >
      <View
        className={cn(
          "size-2.5 rounded-full",
          lowest ? "bg-mint" : "bg-[#C8D1DC]",
        )}
      />
      <View className="flex-1 gap-0.5">
        <T weight="semibold" className="text-[15px]">
          {row.hospitalName}
        </T>
        <T className="text-muted text-xs">
          {`${row.distanceMiles.toFixed(1)} mi${file ? ` · price file ${file}` : ""}`}
        </T>
      </View>
      {row.discountedCashCents === null ? (
        <T className="text-muted text-xs">No cash price published</T>
      ) : (
        <Money
          cents={row.discountedCashCents}
          size={16}
          weight="semibold"
          className={lowest ? "text-mint-ink" : "text-foreground"}
          label={`${row.hospitalName}, hospital's published price`}
        />
      )}
    </Pressable>
  );
}
