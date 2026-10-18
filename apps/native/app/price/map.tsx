import type { NearbyPrice } from "@betterbill/core";
import { SERVICES } from "@betterbill/core/prices/services";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { cn } from "heroui-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
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
  PriceLegend,
  PriceMap,
  T,
  TierBadge,
} from "@/components/bb";
import { errorMessage } from "@/lib/errors";
import { capturedDay, monthYear } from "@/lib/format";
import { useNearby } from "@/lib/prices";
import { orpc } from "@/utils/orpc";

const SHADOW = {
  shadowColor: "#0B1B2B",
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
};

// How much of the sheet shows when peeking: handle, range and its label.
const PEEK = 128;

const openHospital = (hospitalKey: string, code: string) =>
  router.push({
    pathname: "/price/[hospitalKey]",
    params: { hospitalKey, code },
  });

// Price A: the hospitals near you on a map with their published cash price,
// then a sheet with the range and the list. Drag the sheet (or tap its
// handle) between peek, middle and full. Phones draw a real map; the web
// places the same pins by location on a plain background.
export default function PriceMapScreen() {
  const { code = "" } = useLocalSearchParams<{ code: string }>();
  const service = SERVICES.find((s) => s.code === code);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const nearby = useNearby(code);
  const { origin, data } = nearby;
  const reduced = useReducedMotion();

  // The sheet is fullH tall and slides by y: 0 is full, fullH - peek peeks.
  const pad = Math.max(insets.bottom, 16) + 6;
  const fullH = Math.round(height * 0.86);
  const peek = PEEK + pad;
  const mid = Math.min(Math.round(height * 0.48), fullH);
  const stops = { full: 0, mid: fullH - mid, peek: fullH - peek };
  const y = useSharedValue(fullH);
  const from = useSharedValue(0);
  // How much of the sheet shows once it settles: the map fits above it.
  const [visible, setVisible] = useState(mid);
  const expanded = visible >= fullH - 1;

  useEffect(() => {
    // Rise with the prices, or with the error and "Try again", once the
    // last pin has popped in.
    if (!data && !nearby.isError) return;
    const pins = (data?.rows.length ?? 0) * PIN_STEP_MS;
    y.value = reduced
      ? stops.mid
      : withDelay(
          pins + 250,
          withTiming(stops.mid, {
            duration: 550,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
          }),
        );
    setVisible(mid);
  }, [data, nearby.isError, reduced, y, stops.mid, mid]);

  const settle = (to: number) => {
    "worklet";
    y.value = withTiming(to, {
      duration: reduced ? 0 : 280,
      easing: Easing.out(Easing.cubic),
    });
    runOnJS(setVisible)(fullH - to);
  };
  // The same move from buttons and screen reader actions.
  const goTo = (to: number) => {
    y.value = withTiming(to, {
      duration: reduced ? 0 : 280,
      easing: Easing.out(Easing.cubic),
    });
    setVisible(fullH - to);
  };
  const pan = Gesture.Pan()
    .onStart(() => {
      from.value = y.value;
    })
    .onUpdate((e) => {
      y.value = Math.min(stops.peek, Math.max(0, from.value + e.translationY));
    })
    .onEnd((e) => {
      const aim = y.value + e.velocityY * 0.15;
      const options = [stops.full, stops.mid, stops.peek];
      let best = stops.mid;
      for (const o of options) {
        if (Math.abs(o - aim) < Math.abs(best - aim)) best = o;
      }
      settle(best);
    });
  // Tap the handle: peek and full go to the middle, the middle peeks.
  const tap = Gesture.Tap().onEnd(() => {
    settle(Math.abs(y.value - stops.mid) < 4 ? stops.peek : stops.mid);
  });
  const grab = Gesture.Race(pan, tap);
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
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
          className="h-[50px] flex-1 flex-row items-center gap-2.5 rounded-full bg-white px-4"
          style={SHADOW}
        >
          <Icon name="search" size={18} color="#5B6B7C" stroke={2} />
          <View className="flex-1">
            <T weight="semibold" className="text-[15px]" numberOfLines={1}>
              {service?.short ?? code}
            </T>
            <T className="text-muted text-xs" numberOfLines={1}>
              {`CPT ${code} · cash price · near ${origin?.label ?? "you"}`}
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
      {data && data.summary.priced > 1 ? (
        <View className="items-center">
          <PriceLegend kind="price" />
        </View>
      ) : null}
    </View>
  );

  const low = data?.summary.lowCents ?? null;
  const high = data?.summary.highCents ?? null;

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
            insets={{ top: insets.top + 190, bottom: visible + 16 }}
          />
        ) : null}
      </View>
      <View className="px-4" style={{ paddingTop: insets.top + 14 }}>
        {header}
      </View>
      <Animated.View
        className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white"
        style={[
          sheetStyle,
          {
            height: fullH,
            shadowColor: "#0B1B2B",
            shadowOpacity: 0.12,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: -6 },
          },
        ]}
      >
        <GestureDetector gesture={grab}>
          <View
            className="px-5 pt-2.5 pb-1"
            accessibilityRole="adjustable"
            accessibilityLabel="Price list. Drag up for more, down for the map."
            accessibilityActions={[
              { name: "increment" },
              { name: "decrement" },
            ]}
            onAccessibilityAction={(e) =>
              goTo(
                e.nativeEvent.actionName === "increment"
                  ? stops.full
                  : stops.peek,
              )
            }
          >
            <View className="h-[5px] w-10 self-center rounded-full bg-[#D5DAE1]" />
            {low !== null && high !== null ? (
              <View className="gap-1 pt-3.5">
                <View className="flex-row items-center gap-1.5">
                  <Money
                    cents={low}
                    size={26}
                    weight="semibold"
                    label="Lowest"
                    whole
                  />
                  <T weight="semibold" className="text-[26px] leading-[30px]">
                    –
                  </T>
                  <Money
                    cents={high}
                    size={26}
                    weight="semibold"
                    label="Highest"
                    whole
                  />
                </View>
                <T className="text-[13px] text-muted">
                  Published cash prices near you, lowest first
                </T>
                <TierBadge tier="published" />
              </View>
            ) : (
              <View className="h-3" />
            )}
          </View>
        </GestureDetector>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5"
          contentContainerStyle={{ paddingBottom: pad }}
          scrollEnabled={expanded}
          showsVerticalScrollIndicator={false}
        >
          {nearby.isError ? (
            <View className="gap-3 pt-2">
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
            <SheetList
              rows={data.rows}
              code={code}
              expanded={expanded}
              onAll={() => goTo(stops.full)}
            />
          ) : null}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function SheetList({
  rows,
  code,
  expanded,
  onAll,
}: {
  rows: NearbyPrice[];
  code: string;
  expanded: boolean;
  onAll: () => void;
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
  const shown = expanded ? rows : rows.slice(0, 3);
  return (
    <View>
      <View className="mt-1 flex-row gap-2 rounded-xl bg-wash px-3 py-2.5">
        <Icon name="info" size={16} color="#5B6B7C" />
        <T className="flex-1 text-[13px] text-muted leading-[18px]">
          Cash price, if you pay without insurance. Have insurance? Ask your
          plan what you'd owe. It can be more or less than this.
        </T>
      </View>
      <View className="mt-1">
        {shown.map((r, i) => (
          <PriceRow
            key={r.hospitalKey}
            row={r}
            last={i === shown.length - 1}
            onPress={() => openHospital(r.hospitalKey, code)}
          />
        ))}
      </View>
      {!expanded && rows.length > 3 ? (
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
      <LabPrices code={code} />
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
        <T weight="semibold" className="text-[15px]" numberOfLines={1}>
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
          whole
          className={lowest ? "text-mint-ink" : "text-foreground"}
          label={`${row.hospitalName}, hospital's published price`}
        />
      )}
    </Pressable>
  );
}

// Labs' own online prices (order online, blood drawn at the lab). Shown only
// for services a lab publishes, under the hospitals and never ranked with
// them: a different source with its own label.
function LabPrices({ code }: { code: string }) {
  const labs = useQuery(orpc.price.labs.queryOptions({ input: { code } }));
  const rows = labs.data ?? [];
  if (rows.length === 0) return null;
  return (
    <View className="mt-3 gap-2.5 rounded-[18px] border border-hairline px-4 py-3.5">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Icon name="flask" size={18} color="#1E3A8A" />
          <T weight="semibold" className="text-[15px]">
            Lab prices
          </T>
        </View>
        <View className="h-6 flex-row items-center gap-1 rounded-full bg-secondary px-2">
          <Icon name="landmark" size={12} color="#1E3A8A" stroke={2} />
          <T className="text-secondary-ink text-xs">Lab's published price</T>
        </View>
      </View>
      <T className="text-[13px] text-muted leading-[18px]">
        Order the test online, then get your blood drawn at one of the lab's
        locations.
      </T>
      <View>
        {rows.map((r, i) => (
          <Pressable
            key={r.labKey}
            accessibilityRole="link"
            accessibilityLabel={`${r.labName}, opens its test page`}
            onPress={() => void WebBrowser.openBrowserAsync(r.sourceUrl)}
            className={cn(
              "min-h-11 flex-row items-center gap-3 py-2.5",
              i < rows.length - 1 && "border-[#EEF0F3] border-b",
            )}
          >
            <View className="flex-1 gap-0.5">
              <T weight="semibold" className="text-[15px]">
                {r.labName}
              </T>
              {r.detail ? (
                <T className="text-muted text-xs leading-4" numberOfLines={2}>
                  {r.detail}
                </T>
              ) : null}
            </View>
            <Money
              cents={r.cashCents}
              size={16}
              weight="semibold"
              whole
              label={`${r.labName}, lab's published price`}
            />
            <Icon name="chevron" size={16} color="#8A97A6" stroke={2} />
          </Pressable>
        ))}
      </View>
      <T className="text-[13px] text-muted leading-[18px]">
        If your doctor ordered this test, ask if you can have it done at an
        outside lab. With insurance, check what your plan covers there.
      </T>
      <T className="text-[11px] text-muted">
        {`From each lab's website, captured ${capturedDay(rows[0]?.capturedAt ?? "")}.`}
      </T>
    </View>
  );
}
