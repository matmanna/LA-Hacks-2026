import type { HomeBill } from "@betterbill/core";
import { useQueries, useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AccountButton,
  Button,
  Icon,
  Money,
  Progress,
  T,
} from "@/components/bb";
import { loadCases, type SavedCase } from "@/lib/cases";
import { serviceDay } from "@/lib/format";
import { caseStatus } from "@/lib/status";
import { orpc } from "@/utils/orpc";

// Home V4 (Bills tab): what you could save across every bill on this phone,
// where each bill stands, then the bills, the ones that need you first.
// Every sum and count comes from case.summary; nothing is added up here.
export default function Home() {
  const insets = useSafeAreaInsets();
  const [local, setLocal] = useState<SavedCase[]>([]);
  const [tip, setTip] = useState(true);
  const scroll = useRef<ScrollView>(null);
  const rowY = useRef<Record<string, number>>({});

  // Bills saved to the signed-in account, so the web's bills show here too.
  const account = useQuery(orpc.case.list.queryOptions({ input: {} }));
  const known = new Set(local.map((c) => c.id));
  const saved = [
    ...local,
    ...(account.data ?? [])
      .filter((c) => !known.has(c.id))
      .map((c) => ({
        id: c.id,
        createdAt: c.createdAt,
        label: c.hospitalName ?? "Bill",
      })),
  ];

  const reload = useCallback(async () => setLocal(await loadCases()), []);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const cases = useQueries({
    queries: saved.map((c) => ({
      ...orpc.case.get.queryOptions({ input: { caseId: c.id } }),
      refetchInterval: 10_000,
    })),
  });
  const summary = useQuery({
    ...orpc.case.summary.queryOptions({
      input: { caseIds: saved.map((c) => c.id) },
    }),
    enabled: saved.length > 0,
    refetchInterval: 10_000,
  });
  const totals = summary.data;
  const many = saved.length > 1 && totals !== undefined && totals.bills > 1;

  // Single bill: the same card as before, from that bill's audit.
  const latest = cases.find((q) => q.data?.audit)?.data;
  const status = caseStatus(latest);

  // Bills in the server's order; before it loads, as saved.
  const index = new Map(saved.map((c, i) => [c.id, i]));
  const ordered: { saved: SavedCase; i: number; bill: HomeBill | null }[] =
    totals && totals.order.length > 0
      ? totals.order.flatMap((b) => {
          const i = index.get(b.id);
          const s = i === undefined ? undefined : saved[i];
          return i === undefined || !s ? [] : [{ saved: s, i, bill: b }];
        })
      : saved.map((s, i) => ({ saved: s, i, bill: null }));
  const firstNeedsYou = ordered.find((r) => r.bill?.group === "needs_you");
  const showTip =
    tip && totals !== undefined && totals.waiting > 0 && totals.needsYou === 0;

  const jumpToNeedsYou = () => {
    const y = firstNeedsYou ? rowY.current[firstNeedsYou.saved.id] : undefined;
    if (y !== undefined) {
      scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }
  };

  return (
    <View className="flex-1 bg-wash">
      <StatusBar style="dark" />
      <ScrollView
        ref={scroll}
        contentContainerClassName="gap-4 px-5 pb-8"
        contentContainerStyle={{ paddingTop: insets.top + 8 }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              void reload();
              void account.refetch();
              void summary.refetch();
              for (const q of cases) void q.refetch();
            }}
          />
        }
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-baseline gap-1">
            <T weight="serif" className="text-[30px] leading-[34px]">
              BetterBill
            </T>
            <Icon name="check" size={18} color="#0F9D76" stroke={2} />
          </View>
          <AccountButton />
        </View>

        {many && totals ? (
          <View className="gap-3.5 rounded-3xl bg-ink px-[22px] pt-[22px] pb-[18px]">
            <View className="gap-0.5">
              <T className="text-ink-muted text-sm">
                You could save, across {totals.bills} bills
              </T>
              <Money
                cents={totals.savingsCents}
                size={46}
                weight="semibold"
                className="text-white"
                label={`You could save, across ${totals.bills} bills`}
              />
              <View className="flex-row flex-wrap items-center gap-x-1">
                {totals.confirmedCents > 0 ? (
                  <>
                    <Money
                      cents={totals.confirmedCents}
                      size={13}
                      weight="semibold"
                      className="text-mint-soft"
                      label="Confirmed from your bills"
                    />
                    <T weight="semibold" className="text-[13px] text-mint-soft">
                      confirmed
                    </T>
                  </>
                ) : null}
                {totals.confirmedCents > 0 && totals.estimateCents > 0 ? (
                  <T className="text-[13px] text-ink-muted">·</T>
                ) : null}
                {totals.estimateCents > 0 ? (
                  <>
                    <Money
                      cents={totals.estimateCents}
                      size={13}
                      className="text-ink-muted"
                      label="Estimate"
                    />
                    <T className="text-[13px] text-ink-muted">estimate</T>
                  </>
                ) : totals.confirmedCents === 0 ? (
                  <T className="text-[13px] text-ink-muted">
                    Nothing to ask about yet
                  </T>
                ) : null}
              </View>
            </View>
            <View
              className="flex-row flex-wrap items-center gap-2"
              accessibilityLabel="Where your bills stand"
            >
              {totals.needsYou > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${totals.needsYou} ${totals.needsYou === 1 ? "bill needs" : "bills need"} you. Jump to it.`}
                  onPress={jumpToNeedsYou}
                  className="flex-row items-center gap-1 rounded-full bg-mint-soft py-1.5 pr-2 pl-[11px]"
                >
                  <T weight="semibold" className="text-[13px] text-mint-ink">
                    {totals.needsYou} {totals.needsYou === 1 ? "needs" : "need"}{" "}
                    you
                  </T>
                  <Icon name="chevron" size={12} color="#065F46" stroke={2.5} />
                </Pressable>
              ) : null}
              {totals.waiting > 0 || totals.reading > 0 ? (
                <View className="flex-row items-center gap-1.5">
                  {totals.waiting > 0 ? (
                    <>
                      <PulseDot />
                      <T weight="medium" className="text-[13px] text-white">
                        {totals.waiting} waiting on billing
                      </T>
                    </>
                  ) : null}
                  {totals.reading > 0 ? (
                    <T className="text-[13px] text-ink-muted">
                      {totals.waiting > 0 ? "· " : ""}
                      {totals.reading} reading
                    </T>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        ) : latest?.audit ? (
          <View className="gap-[18px] rounded-3xl bg-ink px-[22px] pt-[22px] pb-5">
            <View className="gap-0.5">
              <T className="text-ink-muted text-sm">You could save</T>
              <Money
                cents={latest.audit.balance.lessThanBilledCents}
                size={46}
                weight="semibold"
                className="text-white"
                label="You could save"
              />
              <T className="text-[13px] text-ink-muted">
                {latest.audit.balance.isEstimate ? "Estimate · " : ""}
                {latest.bill?.hospital.name}
              </T>
            </View>
            <View className="gap-2">
              <Progress step={status.step} label={status.title} />
              <View className="flex-row items-center gap-2">
                <View className="size-2 rounded-full bg-mint" />
                <T weight="medium" className="text-[13px] text-white">
                  {status.title}
                </T>
              </View>
            </View>
          </View>
        ) : (
          <View className="gap-3 rounded-3xl bg-ink p-[22px]">
            <T weight="serif" className="text-[30px] text-white leading-9">
              Check a hospital bill
            </T>
            <T className="text-[#D5DCE4] text-[15px] leading-[22px]">
              Snap it or paste it. We show every line, then what looks wrong,
              with proof.
            </T>
            <Button
              label="Check my bill"
              onPress={() => router.push("/scan")}
            />
          </View>
        )}

        {totals && (many || latest?.audit) ? (
          <View className={many ? "gap-2" : undefined}>
            <View className="flex-row rounded-[20px] bg-white py-3.5">
              <Stat n={totals.flags} label="to ask about" coral />
              <Stat
                n={totals.callsMade}
                label={totals.callsMade === 1 ? "call made" : "calls made"}
                divider
              />
              <Stat
                n={totals.emailsSent}
                label={totals.emailsSent === 1 ? "email sent" : "emails sent"}
              />
            </View>
            {many ? (
              <T className="text-center text-[#8A97A6] text-[11px]">
                Across all your bills
              </T>
            ) : null}
          </View>
        ) : null}

        {saved.length > 0 ? (
          <>
            <T weight="semibold" className="pt-2 text-xl leading-[26px]">
              Your bills
            </T>
            {showTip ? (
              <View className="flex-row items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3">
                <Icon name="bell" color="#5B6B7C" />
                <T className="flex-1 text-[13px] text-muted leading-[18px]">
                  You can close the app. Your case is saved here.
                </T>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss"
                  hitSlop={12}
                  onPress={() => setTip(false)}
                >
                  <Icon name="close" size={16} color="#5B6B7C" />
                </Pressable>
              </View>
            ) : null}
            {ordered.map(({ saved: c, i, bill }) => {
              const d = cases[i]?.data;
              const s = caseStatus(d);
              const needs = bill?.group === "needs_you" ? bill.needs : null;
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  onLayout={(e) => {
                    rowY.current[c.id] = e.nativeEvent.layout.y;
                  }}
                  onPress={() =>
                    router.push({
                      pathname: "/case/[id]",
                      params: { id: c.id },
                    })
                  }
                  className="flex-row items-center gap-3.5 rounded-[20px] bg-white p-3"
                >
                  <View className="h-[72px] w-16 gap-1 rounded-xl bg-paper px-[9px] py-2.5">
                    <View className="h-1 w-4/5 rounded-sm bg-[#2A3440]" />
                    {(
                      [
                        ["a", "100%"],
                        ["b", "100%"],
                        ["c", "70%"],
                        ["d", "100%"],
                      ] as const
                    ).map(([key, width]) => (
                      <View
                        key={key}
                        className="h-[3px] rounded-sm bg-[#C8D1DC]"
                        style={{ width }}
                      />
                    ))}
                  </View>
                  <View className="flex-1 gap-1.5">
                    <View className="flex-row justify-between gap-2">
                      <T
                        weight="semibold"
                        className="flex-1 text-base"
                        numberOfLines={1}
                      >
                        {d?.bill?.hospital.name ?? c.label}
                      </T>
                      <T className="text-muted text-xs">
                        {serviceDay(d?.bill?.lines[0]?.serviceDate ?? null) ??
                          ""}
                      </T>
                    </View>
                    {d?.audit ? (
                      <View className="flex-row items-center gap-1">
                        <T className="text-[13px] text-muted">Billed</T>
                        <Money
                          cents={d.audit.balance.billedCents}
                          size={13}
                          className="text-muted"
                        />
                        <T className="text-[13px] text-muted">·</T>
                        <Money
                          cents={-d.audit.balance.lessThanBilledCents}
                          size={13}
                          weight="semibold"
                          className="text-mint-ink"
                        />
                      </View>
                    ) : null}
                    {needs ? (
                      <View className="flex-row items-center gap-1.5 self-start rounded-full bg-mint-soft px-2.5 py-[3px]">
                        <View className="size-1.5 rounded-full bg-mint" />
                        <T weight="medium" className="text-mint-ink text-xs">
                          Needs you: {needs}
                        </T>
                      </View>
                    ) : (
                      <View className="flex-row items-center gap-1.5 self-start rounded-full bg-secondary px-2.5 py-[3px]">
                        <View className="size-1.5 rounded-full bg-accent" />
                        <T
                          weight="medium"
                          className="text-secondary-ink text-xs"
                        >
                          {cases[i]?.isError ? "Offline" : s.title}
                        </T>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

// The mint dot next to "waiting on billing", with a soft ring that breathes
// (still when the phone asks for reduced motion).
function PulseDot() {
  const ring = useRef(new Animated.Value(0)).current;
  const [still, setStill] = useState(false);
  useEffect(() => {
    let on = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (on) setStill(v);
    });
    return () => {
      on = false;
    };
  }, []);
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [ring, still]);
  return (
    <View className="size-[7px] items-center justify-center">
      {still ? null : (
        <Animated.View
          className="absolute size-[7px] rounded-full bg-mint"
          style={{
            opacity: ring.interpolate({
              inputRange: [0, 1],
              outputRange: [0.55, 0],
            }),
            transform: [
              {
                scale: ring.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2.7],
                }),
              },
            ],
          }}
        />
      )}
      <View className="size-[7px] rounded-full bg-mint" />
    </View>
  );
}

function Stat({
  n,
  label,
  coral = false,
  divider = false,
}: {
  n: number;
  label: string;
  coral?: boolean;
  divider?: boolean;
}) {
  return (
    <View
      className={
        divider
          ? "flex-1 items-center gap-0.5 border-hairline border-x"
          : "flex-1 items-center gap-0.5"
      }
    >
      <T
        weight="semibold"
        className={
          coral
            ? "text-2xl text-coral-ink leading-[30px]"
            : "text-2xl leading-[30px]"
        }
      >
        {n}
      </T>
      <T className="text-muted text-xs">{label}</T>
    </View>
  );
}
