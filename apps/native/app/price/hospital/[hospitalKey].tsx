import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { cn } from "heroui-native";
import { useEffect } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { Disclaimer, Icon, Money, Screen, T, TierBadge } from "@/components/bb";
import { errorMessage } from "@/lib/errors";
import { capturedLong, monthYear } from "@/lib/format";
import { useOrigin } from "@/lib/origin";
import { directionsUrl } from "@/lib/prices";
import { orpc } from "@/utils/orpc";

// Price D2: one hospital's published cash price for every service we
// compare, each ranked against the hospitals near the patient. Counts of
// lowest and below-middle prices come from the server; never an average.
export default function HospitalPrices() {
  const { hospitalKey = "" } = useLocalSearchParams<{ hospitalKey: string }>();
  const origin = useOrigin();
  const q = useQuery(
    orpc.price.hospital.queryOptions({
      input: { hospitalKey, lat: origin?.lat ?? 0, lng: origin?.lng ?? 0 },
      enabled: origin !== null && hospitalKey !== "",
    }),
  );
  const h = q.data;

  if (!h) {
    return (
      <Screen>
        {q.isError ? (
          <T className="pt-6 text-coral-ink">{errorMessage(q.error)}</T>
        ) : (
          <ActivityIndicator className="pt-10" color="#1E4ED8" />
        )}
      </Screen>
    );
  }

  const file = monthYear(h.fileUpdatedOn);
  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
  };
  // Segments for the summary bar: lowest, then below the middle, then the
  // rest, one per service. Counting only, from the server's flags.
  const segments = [
    ...h.prices
      .filter((p) => p.lowest)
      .map((p) => ({ p, kind: "low" as const })),
    ...h.prices
      .filter((p) => !p.lowest && p.belowMiddle)
      .map((p) => ({ p, kind: "below" as const })),
    ...h.prices
      .filter((p) => !p.lowest && !p.belowMiddle)
      .map((p) => ({ p, kind: "rest" as const })),
  ];

  return (
    <Screen
      action={
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openURL(directionsUrl(Platform.OS, h))}
          className="h-11 flex-row items-center gap-1.5 rounded-full bg-wash px-3.5"
        >
          <Icon name="navigation" size={16} stroke={2} />
          <T weight="semibold" className="text-sm">
            Directions
          </T>
        </Pressable>
      }
    >
      <T
        weight="semibold"
        className="text-[13px] text-muted uppercase tracking-[0.04em]"
      >
        Hospital
      </T>
      <T
        weight="semibold"
        className="mt-1 text-[26px] leading-[31px] tracking-[-0.01em]"
      >
        {h.hospitalName}
      </T>
      <T className="mt-1.5 text-muted text-sm">
        {`${h.distanceMiles.toFixed(1)} mi · ${h.address}`}
      </T>

      <Rise delay={100}>
        <View className="mt-[18px] gap-3.5 rounded-3xl bg-ink px-5 pt-5 pb-[18px]">
          <View className="gap-1">
            <T className="text-ink-muted text-sm">
              Lowest published cash price near you
            </T>
            <View className="flex-row items-baseline gap-2">
              <T
                weight="semibold"
                className="text-[44px] text-white leading-[48px] tracking-[-0.02em]"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {`${h.lowestOn} of ${h.services}`}
              </T>
              <T className="text-[15px] text-ink-muted">
                {h.services === 1 ? "service" : "services"}
              </T>
            </View>
          </View>
          <View
            className="flex-row items-end gap-1"
            accessible
            accessibilityLabel={`Of ${h.services} services: lowest near you on ${h.lowestOn}, below the middle on ${h.belowMiddleOn}`}
          >
            {segments.map(({ p, kind }, i) => (
              <Segment key={p.code} kind={kind} index={i} />
            ))}
          </View>
          <View className="flex-row flex-wrap gap-3.5">
            <Legend color="bg-mint" label="Lowest near you" />
            <Legend color="bg-mint/45" label="Below the middle" />
            <Legend color="bg-white/30" label="Middle or above" />
          </View>
          <T className="text-[13px] text-white leading-[18px]">
            {`Below the middle price on ${h.belowMiddleOn} of ${h.services}, compared with the hospitals near ${origin?.label ?? "you"}.`}
          </T>
        </View>
      </Rise>

      <View className="mt-[22px] flex-row items-center justify-between gap-2">
        <T weight="semibold" className="text-lg">
          Cash prices
        </T>
        <View className="h-6 justify-center rounded-full bg-secondary px-2">
          <TierBadge tier="published" />
        </View>
      </View>
      <T className="mt-1 text-[13px] text-muted">
        Lowest rank first. Tap one to compare hospitals.
      </T>

      <View className="mt-1.5">
        {h.prices.map((p, i) => (
          <Pressable
            key={p.code}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/price/[hospitalKey]",
                params: { hospitalKey: h.hospitalKey, code: p.code },
              })
            }
            className={cn(
              "flex-row items-center gap-3 py-3",
              i < h.prices.length - 1 && "border-[#EEF0F3] border-b",
            )}
          >
            <View className="flex-1 gap-1">
              <T weight="semibold" className="text-[15px]">
                {p.name}
              </T>
              {p.discountedCashCents === null ? (
                <T className="text-muted text-xs">No cash price published</T>
              ) : (
                <View
                  className={cn(
                    "h-[22px] justify-center self-start rounded-full px-2",
                    p.lowest ? "bg-mint-soft" : "bg-slate-soft",
                  )}
                >
                  <T
                    weight="semibold"
                    className={cn(
                      "text-[11px]",
                      p.lowest ? "text-mint-ink" : "text-slate-ink",
                    )}
                  >
                    {p.lowest
                      ? `Lowest of ${p.priced}`
                      : `${ordinal(p.rank ?? 0)} of ${p.priced}`}
                  </T>
                </View>
              )}
            </View>
            {p.discountedCashCents === null ? null : (
              <Money
                cents={p.discountedCashCents}
                size={16}
                weight="semibold"
                whole
                className={p.lowest ? "text-mint-ink" : "text-foreground"}
                label={`${p.name}, hospital's published price`}
              />
            )}
            <Icon name="chevron" size={16} color="#8A97A6" stroke={2} />
          </Pressable>
        ))}
      </View>

      <View className="mt-4 flex-row gap-2 rounded-xl bg-wash px-3 py-2.5">
        <Icon name="info" size={16} color="#5B6B7C" />
        <T className="flex-1 text-[13px] text-muted leading-[18px]">
          Cash prices, if you pay without insurance. Have insurance? Ask your
          plan what you'd owe. It can be more or less than this.
        </T>
      </View>

      <View className="mt-3 flex-row items-center gap-3 rounded-[18px] border border-hairline px-4 py-3.5">
        <View className="size-9 items-center justify-center rounded-[10px] bg-wash">
          <Icon name="doc" size={18} color="#334155" />
        </View>
        <View className="flex-1 gap-0.5">
          <T weight="semibold" className="text-sm">
            From the hospital's own price file
          </T>
          <T className="text-muted text-xs leading-4">
            {[
              file ? `File dated ${file}` : null,
              `we captured it ${capturedLong(h.capturedAt)}`,
              h.sourceSha256 ? `sha256 ${h.sourceSha256.slice(0, 6)}…` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </T>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${h.hospitalName}'s price page`}
          hitSlop={10}
          onPress={() =>
            void WebBrowser.openBrowserAsync(h.pageUrl ?? h.sourceUrl)
          }
          className="min-h-11 justify-center"
        >
          <T weight="semibold" className="text-[13px] text-accent">
            Open
          </T>
        </Pressable>
      </View>

      <View className="gap-2 pt-5">
        <T className="text-center text-[11px] text-muted leading-[15px]">
          Published cash prices are the hospital's own fee. Doctors may bill
          separately.
        </T>
        <Disclaimer />
      </View>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={cn("size-2 rounded-[2px]", color)} />
      <T className="text-ink-muted text-xs">{label}</T>
    </View>
  );
}

// One service in the summary bar; grows in on arrival unless reduce motion.
function Segment({
  kind,
  index,
}: {
  kind: "low" | "below" | "rest";
  index: number;
}) {
  const reduced = useReducedMotion();
  const v = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    v.value = withDelay(
      350 + index * 50,
      withTiming(1, { duration: 400, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }),
    );
  }, [index, reduced, v]);
  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scaleY: 0.2 + v.value * 0.8 }],
  }));
  return (
    <Animated.View
      className={cn(
        "h-[26px] flex-1 rounded-md",
        kind === "low"
          ? "bg-mint"
          : kind === "below"
            ? "bg-mint/45"
            : "bg-white/15",
      )}
      style={style}
    />
  );
}

function Rise({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const shown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    shown.value = reduced
      ? 1
      : withDelay(
          delay,
          withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) }),
        );
  }, [delay, reduced, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 8 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
