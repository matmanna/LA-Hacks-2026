import { SERVICES } from "@betterbill/core/prices/services";
import { useQueries } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { cn } from "heroui-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import {
  Button,
  Disclaimer,
  Icon,
  Money,
  Screen,
  T,
  TierBadge,
} from "@/components/bb";
import { loadCases, type SavedCase } from "@/lib/cases";
import { errorMessage } from "@/lib/errors";
import { capturedLong, monthYear } from "@/lib/format";
import { directionsUrl, useNearby } from "@/lib/prices";
import { isSaved, toggleSavedPrice, useSavedPrices } from "@/lib/saved-prices";
import { orpc } from "@/utils/orpc";

// Price A2: one hospital's published cash price for the service, how it
// compares with the others near you, where it comes from, and what to do.
export default function PriceHospital() {
  const { hospitalKey = "", code = "" } = useLocalSearchParams<{
    hospitalKey: string;
    code: string;
  }>();
  const service = SERVICES.find((s) => s.code === code);
  const nearby = useNearby(code);
  const [saved, setSaved] = useSavedPrices();
  const [cases, setCases] = useState<SavedCase[]>([]);
  useFocusEffect(
    useCallback(() => {
      void loadCases().then(setCases);
    }, []),
  );
  const details = useQueries({
    queries: cases.map((c) =>
      orpc.case.get.queryOptions({ input: { caseId: c.id } }),
    ),
  });

  const data = nearby.data;
  const row = data?.rows.find((r) => r.hospitalKey === hospitalKey);
  if (!row || !data) {
    return (
      <Screen>
        {nearby.isError ? (
          <T className="pt-6 text-coral-ink">{errorMessage(nearby.error)}</T>
        ) : data ? (
          <T className="pt-6 text-muted">
            This hospital has no price on file for this service.
          </T>
        ) : (
          <ActivityIndicator className="pt-10" color="#1E4ED8" />
        )}
      </Screen>
    );
  }

  const { summary } = data;
  const n = summary.priced;
  const cash = row.discountedCashCents;
  // A bill from this hospital on this phone opens the assistance questions.
  const caseHere = cases.find(
    (_, i) => details[i]?.data?.bill?.hospital.name === row.hospitalName,
  );
  const policy = row.policy;
  const here = isSaved(saved, row.hospitalKey, code);
  const file = monthYear(row.fileUpdatedOn);

  return (
    <Screen aside={service ? `CPT ${service.code}` : undefined}>
      <T className="text-muted text-sm">{service?.name ?? `CPT ${code}`}</T>
      <T
        weight="semibold"
        className="mt-1 text-[26px] leading-8 tracking-[-0.01em]"
      >
        {row.hospitalName}
      </T>
      <T className="mt-1 text-muted text-sm">
        {`${row.distanceMiles.toFixed(1)} mi · ${row.address}`}
      </T>

      <Rise delay={100}>
        <View className="mt-[18px] gap-2">
          {cash === null ? (
            <T weight="semibold" className="text-[22px] text-muted">
              No cash price published
            </T>
          ) : (
            <Money
              cents={cash}
              size={44}
              weight="semibold"
              label="Hospital's published price"
            />
          )}
          <View className="flex-row flex-wrap items-center gap-2">
            <View className="h-[26px] justify-center rounded-full bg-secondary px-2.5">
              <TierBadge tier="published" />
            </View>
            {row.rank !== null ? (
              <T className="text-[13px] text-muted">
                {row.rank === 1
                  ? `Lowest of ${n} near you · estimate`
                  : `${ordinal(row.rank)} lowest of ${n} near you · estimate`}
              </T>
            ) : null}
          </View>
        </View>
      </Rise>

      {cash !== null && summary.highCents !== null && n > 1 ? (
        <Rise delay={250}>
          <View className="mt-4 gap-2.5 rounded-[18px] bg-wash px-4 py-3.5">
            <T weight="semibold" className="text-[13px] text-muted">
              {`Compared with the ${n} hospitals near you`}
            </T>
            <Compare
              label="This hospital"
              cents={cash}
              share={row.shareOfHighest ?? 0}
              tone={row.rank === 1 ? "low" : "mid"}
              strong
            />
            {summary.middleCents !== null ? (
              <Compare
                label={`Middle of the ${n}`}
                cents={summary.middleCents}
                share={summary.middleShareOfHighest ?? 0}
                tone="mid"
              />
            ) : null}
            <Compare
              label="Highest"
              cents={summary.highCents}
              share={1}
              tone="high"
            />
          </View>
        </Rise>
      ) : null}

      <Rise delay={400}>
        <View className="mt-3 gap-2.5 rounded-[18px] border border-hairline px-4 py-3.5">
          <T weight="semibold" className="text-[15px]">
            What this price covers
          </T>
          <Covers yes>
            The hospital's own fee, paid in cash without insurance.
          </Covers>
          {service ? <Covers>{service.notCovered}</Covers> : null}
          <Covers>
            With insurance, your plan's rate applies instead. Ask for it when
            you book.
          </Covers>
          {row.grossChargeCents !== null ? (
            <View className="flex-row items-center justify-between border-[#EEF0F3] border-t pt-2.5">
              <T className="text-muted text-sm">List price before discounts</T>
              <Money
                cents={row.grossChargeCents}
                size={14}
                weight="semibold"
                label="List price"
              />
            </View>
          ) : null}
        </View>
      </Rise>

      <Rise delay={550}>
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
                `we captured it ${capturedLong(row.capturedAt)}`,
                row.sourceSha256
                  ? `sha256 ${row.sourceSha256.slice(0, 6)}…`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </T>
          </View>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open ${row.hospitalName}'s price page`}
            hitSlop={10}
            onPress={() =>
              void WebBrowser.openBrowserAsync(row.pageUrl ?? row.sourceUrl)
            }
            className="min-h-11 justify-center"
          >
            <T weight="semibold" className="text-[13px] text-accent">
              Open
            </T>
          </Pressable>
        </View>
      </Rise>

      {policy ? (
        <Rise delay={700}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              caseHere
                ? router.push({
                    pathname: "/case/[id]/assist",
                    params: { id: caseHere.id },
                  })
                : void WebBrowser.openBrowserAsync(policy.policyUrl)
            }
            className="mt-3 flex-row items-center gap-3 rounded-2xl bg-[#EEF7F3] px-4 py-3.5"
          >
            <View className="flex-1 gap-0.5">
              <T weight="semibold" className="text-[15px]">
                Help paying here
              </T>
              <T className="text-[#3E5A50] text-[13px] leading-[18px]">
                {[
                  policy.freeCareMaxFplPct !== null
                    ? `This hospital's policy lists free care up to ${policy.freeCareMaxFplPct}% of the poverty line.`
                    : "This hospital has a financial assistance policy.",
                  caseHere
                    ? "Two questions tell you if you may qualify."
                    : "Read the policy.",
                ].join(" ")}
              </T>
            </View>
            <Icon name="chevron" size={16} color="#3E5A50" />
          </Pressable>
        </Rise>
      ) : null}

      <View className="mt-6 gap-2.5">
        <Button
          label={here ? "Saved" : "Save this price"}
          icon={
            here ? <Icon name="check" size={18} color="#FFFFFF" /> : undefined
          }
          className="h-[52px] rounded-full bg-ink"
          onPress={async () =>
            setSaved(
              await toggleSavedPrice({
                hospitalKey: row.hospitalKey,
                hospitalName: row.hospitalName,
                code,
                serviceName: service?.name ?? `CPT ${code}`,
                cashCents: cash,
                capturedAt: row.capturedAt,
                savedAt: new Date().toISOString(),
              }),
            )
          }
        />
        <T className="-mt-1 text-center text-muted text-xs leading-4">
          {here
            ? "Saved on this phone. Tap again to remove it."
            : "Keeps this price on the Prices tab, on this phone."}
        </T>
        <View className="flex-row gap-2.5">
          <View className="flex-1 gap-1">
            <Button label="Ask billing to confirm" variant="disabled" />
            <T className="text-center text-[11px] text-muted">Coming soon</T>
          </View>
          <View className="flex-1">
            <Button
              label="Directions"
              variant="outline"
              className="h-12"
              onPress={() =>
                void Linking.openURL(directionsUrl(Platform.OS, row))
              }
            />
          </View>
        </View>
        <View className="pt-2">
          <Disclaimer />
        </View>
      </View>
    </Screen>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function Compare({
  label,
  cents,
  share,
  tone,
  strong = false,
}: {
  label: string;
  cents: number;
  share: number;
  tone: "low" | "mid" | "high";
  strong?: boolean;
}) {
  const reduced = useReducedMotion();
  const w = useSharedValue(reduced ? share : 0);
  useEffect(() => {
    w.value = reduced
      ? share
      : withDelay(
          500,
          withTiming(share, { duration: 700, easing: Easing.out(Easing.quad) }),
        );
  }, [share, reduced, w]);
  const bar = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <T weight={strong ? "semibold" : "regular"} className="text-sm">
          {label}
        </T>
        <Money
          cents={cents}
          size={14}
          weight="semibold"
          label={label}
          className={
            tone === "low"
              ? "text-mint-ink"
              : tone === "high"
                ? "text-coral-ink"
                : "text-foreground"
          }
        />
      </View>
      <View className="h-2.5 overflow-hidden rounded-full bg-white">
        <Animated.View
          className={cn(
            "h-full rounded-full",
            tone === "low"
              ? "bg-mint"
              : tone === "high"
                ? "bg-[#F4B5B8]"
                : "bg-[#8A97A6]",
          )}
          style={bar}
        />
      </View>
    </View>
  );
}

function Covers({
  yes = false,
  children,
}: {
  yes?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row gap-2.5">
      <View className="pt-0.5">
        <Icon
          name={yes ? "check" : "dash"}
          size={16}
          color={yes ? "#0F9D76" : "#8A97A6"}
          stroke={2.5}
        />
      </View>
      <T className="flex-1 text-sm leading-5">{children}</T>
    </View>
  );
}

// A short fade and rise; none when reduce motion is on.
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
