import type { NearbyPrice } from "@betterbill/core";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { cn } from "heroui-native";
import { type ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
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
  PriceMap,
  T,
  TierBadge,
} from "@/components/bb";
import { errorMessage } from "@/lib/errors";
import { capturedDay } from "@/lib/format";
import { orpc } from "@/utils/orpc";

// Downtown Los Angeles, used when location is off or on the web.
const FALLBACK = { lat: 34.0522, lng: -118.2437 };

type Origin = { lat: number; lng: number; here: boolean };

// Asks for location once. Coordinates are rounded to about 100 m before
// they leave the phone.
function useOrigin(): Origin | null {
  const [origin, setOrigin] = useState<Origin | null>(
    Platform.OS === "web" ? { ...FALLBACK, here: false } : null,
  );
  useEffect(() => {
    if (Platform.OS === "web") return;
    let live = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") throw new Error("Location is off");
        const pos =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }));
        const round = (n: number) => Math.round(n * 1000) / 1000;
        if (live) {
          setOrigin({
            lat: round(pos.coords.latitude),
            lng: round(pos.coords.longitude),
            here: true,
          });
        }
      } catch {
        if (live) setOrigin({ ...FALLBACK, here: false });
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  return origin;
}

// "Before you go": what nearby hospitals publish as their cash price for a
// service, ranked by the server. The phone only displays the rows.
export default function Prices() {
  const insets = useSafeAreaInsets();
  const origin = useOrigin();
  const [code, setCode] = useState("72148");
  const services = useQuery(orpc.price.services.queryOptions({ input: {} }));
  const nearby = useQuery(
    orpc.price.nearby.queryOptions({
      input: {
        code,
        lat: origin?.lat ?? FALLBACK.lat,
        lng: origin?.lng ?? FALLBACK.lng,
      },
      enabled: origin !== null,
    }),
  );
  const service = services.data?.find((s) => s.code === code);
  const rows = nearby.data ?? [];
  const priced = rows.filter((r) => r.discountedCashCents !== null);
  // Rows come ranked, so the range is the first and last priced row.
  const low = priced[0]?.discountedCashCents ?? null;
  const high = priced[priced.length - 1]?.discountedCashCents ?? null;

  return (
    <View className="flex-1 bg-wash">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="gap-4 pb-8"
        contentContainerStyle={{ paddingTop: insets.top + 8 }}
      >
        <View className="gap-1 px-5">
          <T weight="serif" className="text-[30px] leading-[34px]">
            Before you go
          </T>
          <T className="text-[15px] text-muted leading-[22px]">
            What nearby hospitals publish for a service, before you book.
          </T>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-5"
          accessibilityRole="radiogroup"
          accessibilityLabel="Service"
        >
          {(services.data ?? []).map((s) => {
            const on = s.code === code;
            return (
              <Pressable
                key={s.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setCode(s.code)}
                className={cn(
                  "h-11 justify-center rounded-full px-4",
                  on ? "bg-ink" : "border border-hairline bg-white",
                )}
              >
                <T
                  weight={on ? "semibold" : "medium"}
                  className={cn("text-sm", on ? "text-white" : "text-ink")}
                >
                  {s.name}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="gap-1.5 px-5">
          {service ? (
            <T className="text-[13px] text-muted leading-[18px]">
              {`${service.what} Code ${service.code}.`}
            </T>
          ) : null}
          <View className="flex-row items-center gap-1.5">
            <Icon name="mapPin" size={16} color="#5B6B7C" />
            <T className="flex-1 text-[13px] text-muted leading-[18px]">
              {origin === null
                ? "Finding where you are…"
                : origin.here
                  ? "Distances from where you are."
                  : "Distances from downtown Los Angeles. Allow location for yours."}
            </T>
          </View>
        </View>

        {origin === null || nearby.isPending ? (
          <ActivityIndicator className="pt-10" color="#1E4ED8" />
        ) : nearby.isError ? (
          <View className="mx-5 gap-3 rounded-[20px] bg-white p-4">
            <T className="text-coral-ink text-sm leading-5">
              {errorMessage(nearby.error)}
            </T>
            <Button
              label="Try again"
              variant="secondary"
              onPress={() => void nearby.refetch()}
            />
          </View>
        ) : rows.length === 0 ? (
          <View className="mx-5 gap-1 rounded-[20px] bg-white p-4">
            <T weight="semibold" className="text-base">
              No prices for this service yet
            </T>
            <T className="text-muted text-sm leading-5">
              None of the hospitals we captured list it in their price file.
            </T>
          </View>
        ) : (
          <>
            <View className="px-5">
              <PriceMap rows={rows} origin={origin} here={origin.here} />
            </View>

            {low !== null && high !== null ? (
              <Rise index={0}>
                <View className="gap-0.5 px-5">
                  <View className="flex-row items-center gap-1.5">
                    <Money cents={low} size={28} weight="semibold" />
                    <T weight="semibold" className="text-[28px] leading-[34px]">
                      –
                    </T>
                    <Money cents={high} size={28} weight="semibold" />
                  </View>
                  <T className="text-[13px] text-muted">
                    {`Published cash prices at ${priced.length} ${priced.length === 1 ? "hospital" : "hospitals"}, lowest first`}
                  </T>
                </View>
              </Rise>
            ) : null}

            <View className="mx-5 rounded-[20px] bg-white px-4">
              {rows.map((r, i) => (
                <Rise key={r.hospitalKey} index={i + 1}>
                  <PriceRow
                    row={r}
                    rank={r.discountedCashCents === null ? null : i + 1}
                    lowest={i === 0 && r.discountedCashCents !== null}
                    last={i === rows.length - 1}
                  />
                </Rise>
              ))}
            </View>
          </>
        )}

        <View className="gap-2 px-5 pt-2">
          <T className="text-center text-muted text-xs leading-4">
            Published cash prices for the hospital's own fee. Your cost depends
            on your insurance and what's done during the visit. Estimate.
          </T>
          <Disclaimer />
        </View>
      </ScrollView>
    </View>
  );
}

function PriceRow({
  row,
  rank,
  lowest,
  last,
}: {
  row: NearbyPrice;
  rank: number | null;
  lowest: boolean;
  last: boolean;
}) {
  const link = row.pageUrl ?? row.sourceUrl;
  return (
    <View
      className={cn(
        "flex-row gap-3 py-3.5",
        !last && "border-hairline border-b",
      )}
    >
      <T
        weight="semibold"
        className={cn(
          "w-5 pt-0.5 text-[13px]",
          lowest ? "text-mint-ink" : "text-muted",
        )}
      >
        {rank === null ? "–" : String(rank)}
      </T>
      <View className="flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <T weight="semibold" className="text-[15px] leading-5">
              {row.hospitalName}
            </T>
            <T className="text-muted text-xs" numberOfLines={1}>
              {`${row.distanceMiles.toFixed(1)} mi · ${row.address}`}
            </T>
          </View>
          {row.discountedCashCents === null ? null : (
            <Money
              cents={row.discountedCashCents}
              size={16}
              weight="semibold"
              className={lowest ? "text-mint-ink" : "text-foreground"}
              label={`${row.hospitalName}, published cash price`}
            />
          )}
        </View>
        {lowest ? (
          <View className="self-start rounded-full bg-mint-soft px-2.5 py-1">
            <T weight="medium" className="text-mint-ink text-xs">
              Lowest published cash price
            </T>
          </View>
        ) : null}
        {row.discountedCashCents === null ? (
          <T weight="medium" className="text-muted text-sm">
            No cash price published
          </T>
        ) : (
          <TierBadge tier="published" />
        )}
        {row.grossChargeCents === null ? null : (
          <View className="flex-row items-center gap-1">
            <T className="text-muted text-xs">List price</T>
            <Money
              cents={row.grossChargeCents}
              size={12}
              weight="regular"
              className="text-muted"
              label="List price"
            />
          </View>
        )}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Price file source for ${row.hospitalName}, captured ${capturedDay(row.capturedAt)}`}
          onPress={() => void WebBrowser.openBrowserAsync(link)}
          hitSlop={8}
          className="min-h-11 flex-row items-center gap-1 self-start"
        >
          <Icon name="link" size={14} color="#1E4ED8" />
          <T weight="medium" className="text-accent text-xs">
            {`Source · captured ${capturedDay(row.capturedAt)}`}
          </T>
        </Pressable>
      </View>
    </View>
  );
}

// A short fade and rise as rows arrive; none when reduce motion is on.
// Plain shared values, so it runs on phones and on the web alike.
function Rise({ index, children }: { index: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const shown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    shown.value = reduced
      ? 1
      : withDelay(
          Math.min(index, 8) * 45,
          withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
        );
  }, [index, reduced, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 8 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
