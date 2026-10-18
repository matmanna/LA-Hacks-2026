import { useQueries, useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
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

// W2 Home V2 (Bills tab): the latest bill's savings and status, then every bill on this
// phone. Amounts come from each case's audit; nothing is added up here.
export default function Home() {
  const insets = useSafeAreaInsets();
  const [local, setLocal] = useState<SavedCase[]>([]);
  const [tip, setTip] = useState(true);
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
  const latest = cases.find((q) => q.data?.audit)?.data;
  const status = caseStatus(latest);
  const sent = latest?.actions.filter((a) => a.sentAt).length ?? 0;
  const called = latest?.case.status === "called" ? 1 : 0;

  return (
    <View className="flex-1 bg-wash">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-8"
        contentContainerStyle={{ paddingTop: insets.top + 8 }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              void reload();
              void account.refetch();
              for (const q of cases) void q.refetch();
            }}
          />
        }
      >
        <View className="flex-row items-center justify-between">
          <T weight="serif" className="text-[30px] leading-[34px]">
            BetterBill
          </T>
          <AccountButton />
        </View>

        {latest?.audit ? (
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

        {latest?.audit ? (
          <View className="flex-row rounded-[20px] bg-white py-3.5">
            <Stat n={latest.audit.flags.length} label="to ask about" coral />
            <Stat
              n={called}
              label={called === 1 ? "call made" : "calls made"}
              divider
            />
            <Stat n={sent} label={sent === 1 ? "email sent" : "emails sent"} />
          </View>
        ) : null}

        {saved.length > 0 ? (
          <>
            <T weight="semibold" className="pt-2 text-xl leading-[26px]">
              Your bills
            </T>
            {tip && (latest?.case.status === "sent" || called) ? (
              <View className="flex-row items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3">
                <Icon name="bell" color="#5B6B7C" />
                <T className="flex-1 text-[13px] text-muted leading-[18px]">
                  You can close the app. We'll text you when billing replies.
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
            {saved.map((c, i) => {
              const d = cases[i]?.data;
              const s = caseStatus(d);
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
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
                    <View className="flex-row items-center gap-1.5 self-start rounded-full bg-secondary px-2.5 py-[3px]">
                      <View className="size-1.5 rounded-full bg-accent" />
                      <T weight="medium" className="text-secondary-ink text-xs">
                        {cases[i]?.isError ? "Offline" : s.title}
                      </T>
                    </View>
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
