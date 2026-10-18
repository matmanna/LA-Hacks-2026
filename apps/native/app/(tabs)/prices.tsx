import { SERVICES } from "@betterbill/core/prices/services";
import { useQueries } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AccountButton,
  Disclaimer,
  Icon,
  type IconName,
  Money,
  T,
} from "@/components/bb";
import { loadCases, type SavedCase } from "@/lib/cases";
import { canChangeOrigin, changeOrigin, useOrigin } from "@/lib/origin";
import { useSavedPrices } from "@/lib/saved-prices";
import { orpc } from "@/utils/orpc";

const CODES = new Set(SERVICES.map((s) => s.code));

const openService = (code: string) =>
  router.push({ pathname: "/price/map", params: { code } });

// Price A0, "Before you go": search, services found on the patient's own
// bills, saved prices, and the common services we have price files for.
export default function Prices() {
  const insets = useSafeAreaInsets();
  const origin = useOrigin();
  const [saved] = useSavedPrices();
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

  // Lines on confirmed bills whose code is one we have prices for, once each.
  const fromBills = details
    .flatMap((q) => {
      const d = q.data;
      if (!d?.bill || d.case.status === "new") return [];
      const hospital = d.bill.hospital.name;
      return d.bill.lines
        .filter((l) => l.code !== null && CODES.has(l.code))
        .map((line) => ({ line, hospital }));
    })
    .filter(
      (x, i, all) => all.findIndex((y) => y.line.code === x.line.code) === i,
    )
    .slice(0, 3);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="px-5 pb-8"
        contentContainerStyle={{ paddingTop: insets.top + 14 }}
      >
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <T
              weight="semibold"
              className="text-[28px] leading-[34px] tracking-[-0.01em]"
            >
              Before you go
            </T>
            <AccountButton />
          </View>
          <T className="text-[15px] text-muted leading-[21px]">
            See what nearby hospitals publish for a scan, test or visit.
          </T>
        </View>

        <Pressable
          accessibilityRole="search"
          accessibilityLabel="Search a service, test or scan"
          onPress={() => router.push("/price/search")}
          className="mt-4 h-[52px] flex-row items-center gap-2.5 rounded-full bg-wash px-[18px]"
        >
          <Icon name="search" color="#5B6B7C" stroke={2} />
          <T className="text-base text-muted">Search a service, test or scan</T>
        </Pressable>

        <View className="mt-1.5 min-h-11 flex-row items-center gap-1.5">
          <Icon name="mapPin" size={14} color="#5B6B7C" stroke={2} />
          <T className="text-[13px] text-muted">
            {origin === null
              ? "Finding where you are…"
              : `Near ${origin.label}`}
          </T>
          {origin !== null && canChangeOrigin ? (
            <>
              <T className="text-[13px] text-muted">·</T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  origin.here
                    ? "Use downtown Los Angeles instead"
                    : "Use my location"
                }
                hitSlop={12}
                onPress={changeOrigin}
              >
                <T weight="semibold" className="text-[13px] text-accent">
                  {origin.here ? "Change" : "Use my location"}
                </T>
              </Pressable>
            </>
          ) : null}
        </View>

        {fromBills.length > 0 ? (
          <Section title="From your bills">
            {fromBills.map(({ line, hospital }, i) => (
              <ListRow
                key={line.id}
                icon="doc"
                title={
                  SERVICES.find((s) => s.code === line.code)?.name ??
                  line.description
                }
                last={i === fromBills.length - 1}
                onPress={() => line.code && openService(line.code)}
              >
                <View className="flex-row flex-wrap items-center gap-1">
                  <T className="text-muted text-xs">
                    {`On your ${hospital} bill · billed`}
                  </T>
                  <Money
                    cents={line.chargeCents}
                    size={12}
                    weight="regular"
                    className="text-muted"
                    label="Billed"
                  />
                </View>
              </ListRow>
            ))}
          </Section>
        ) : null}

        {saved.length > 0 ? (
          <Section title="Saved">
            {saved.slice(0, 5).map((s, i) => (
              <ListRow
                key={`${s.hospitalKey}-${s.code}`}
                icon="landmark"
                title={s.serviceName}
                last={i === Math.min(saved.length, 5) - 1}
                onPress={() =>
                  router.push({
                    pathname: "/price/[hospitalKey]",
                    params: { hospitalKey: s.hospitalKey, code: s.code },
                  })
                }
              >
                <View className="flex-row flex-wrap items-center gap-1">
                  <T className="shrink text-muted text-xs" numberOfLines={1}>
                    {`${s.hospitalName} ·`}
                  </T>
                  {s.cashCents === null ? (
                    <T className="text-muted text-xs">No cash price</T>
                  ) : (
                    <Money
                      cents={s.cashCents}
                      size={12}
                      weight="regular"
                      className="text-muted"
                      label="Hospital's published price"
                    />
                  )}
                </View>
              </ListRow>
            ))}
          </Section>
        ) : null}

        <View className="mt-[22px] gap-2.5">
          <SectionTitle>Common</SectionTitle>
          <View className="flex-row flex-wrap gap-2">
            {SERVICES.map((s) => (
              <Pressable
                key={s.code}
                accessibilityRole="button"
                onPress={() => openService(s.code)}
                className="h-11 justify-center rounded-full border border-hairline bg-white px-3.5"
              >
                <T weight="medium" className="text-sm">
                  {s.short}
                </T>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/scan")}
          className="mt-[22px] flex-row items-center gap-3.5 rounded-2xl bg-secondary px-4 py-3.5"
        >
          <View className="size-10 items-center justify-center rounded-full bg-white">
            <Icon name="scan" color="#1E3A8A" />
          </View>
          <View className="flex-1 gap-0.5">
            <T weight="semibold" className="text-base">
              Have a doctor's order? Scan it
            </T>
            <T className="text-[13px] text-secondary-ink leading-[18px]">
              Opens the camera. Reading the test from an order is coming soon.
            </T>
          </View>
          <Icon name="chevron" size={16} color="#1E3A8A" />
        </Pressable>

        <View className="pt-6">
          <Disclaimer />
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <T
      weight="semibold"
      className="text-[13px] text-muted uppercase tracking-[0.02em]"
    >
      {children}
    </T>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-[22px]">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </View>
  );
}

function ListRow({
  icon,
  title,
  last,
  onPress,
  children,
}: {
  icon: IconName;
  title: string;
  last: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={
        last
          ? "flex-row items-center gap-3 py-3"
          : "flex-row items-center gap-3 border-[#EEF0F3] border-b py-3"
      }
    >
      <View className="size-9 items-center justify-center rounded-[10px] bg-wash">
        <Icon name={icon} size={18} color="#334155" />
      </View>
      <View className="flex-1 gap-0.5">
        <T weight="semibold" className="text-[15px]">
          {title}
        </T>
        {children}
      </View>
      <Icon name="chevron" size={16} color="#8A97A6" stroke={2} />
    </Pressable>
  );
}
