import { SERVICES } from "@betterbill/core/prices/services";
import { useQueries, useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AccountButton,
  Button,
  Disclaimer,
  DragSheet,
  Icon,
  type IconName,
  Money,
  PIN_STEP_MS,
  PriceLegend,
  PriceMap,
  T,
} from "@/components/bb";
import { loadCases, type SavedCase } from "@/lib/cases";
import { errorMessage } from "@/lib/errors";
import { canChangeOrigin, changeOrigin, useOrigin } from "@/lib/origin";
import { useSavedPrices } from "@/lib/saved-prices";
import { orpc } from "@/utils/orpc";

const CODES = new Set(SERVICES.map((s) => s.code));

const SHADOW = {
  shadowColor: "#0B1B2B",
  shadowOpacity: 0.14,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
};

const openService = (code: string) =>
  router.push({ pathname: "/price/map", params: { code } });
const openHospital = (hospitalKey: string) =>
  router.push({
    pathname: "/price/hospital/[hospitalKey]",
    params: { hospitalKey },
  });

// Price D0, the Prices tab: a map of the hospitals near you whose price
// files we captured. Search a service or hospital, or drag the sheet up for
// services on your bills, saved prices, every service and every hospital.
export default function Prices() {
  const insets = useSafeAreaInsets();
  const origin = useOrigin();
  const [saved] = useSavedPrices();
  const [sheet, setSheet] = useState(420);
  const [area, setArea] = useState(0);
  const hospitals = useQuery(
    orpc.price.hospitals.queryOptions({
      input: { lat: origin?.lat ?? 0, lng: origin?.lng ?? 0 },
      enabled: origin !== null,
    }),
  );
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

  const list = hospitals.data ?? [];
  const hasCards = fromBills.length > 0 || saved.length > 0;
  const peek = hasCards ? 188 : 124;
  // The mini cards repeat the lists below, so they show only while peeking.
  const peeking = sheet <= peek + 1;
  const services = SERVICES.length;

  return (
    <View
      className="flex-1 bg-[#EEF1F5]"
      onLayout={(e) => setArea(e.nativeEvent.layout.height)}
    >
      <StatusBar style="dark" />
      <View className="absolute inset-0">
        {origin ? (
          <PriceMap
            kind="hospital"
            rows={list}
            origin={origin}
            here={origin.here}
            onSelect={openHospital}
            insets={{ top: insets.top + 160, bottom: sheet + 16 }}
          />
        ) : null}
      </View>

      <View style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-2.5 px-4">
          <Pressable
            accessibilityRole="search"
            accessibilityLabel="Search a service or hospital"
            onPress={() => router.push("/price/search")}
            className="h-[52px] flex-1 flex-row items-center gap-2.5 rounded-full bg-white px-[18px]"
            style={SHADOW}
          >
            <Icon name="search" color="#0B1B2B" stroke={2} />
            <T className="text-[15px] text-muted">
              Search a service or hospital
            </T>
          </Pressable>
          <View className="rounded-full bg-white" style={SHADOW}>
            <AccountButton />
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-4 pt-3 pb-2"
        >
          {SERVICES.map((s) => (
            <Pressable
              key={s.code}
              accessibilityRole="button"
              onPress={() => openService(s.code)}
              className="h-11 justify-center rounded-full bg-white px-3.5"
              style={SHADOW}
            >
              <T weight="semibold" className="text-[13px]">
                {s.short}
              </T>
            </Pressable>
          ))}
        </ScrollView>
        {list.length > 0 ? (
          <View className="px-4">
            <PriceLegend kind="hospital" />
          </View>
        ) : null}
      </View>

      {area > 0 ? (
        <DragSheet
          ready={hospitals.isSuccess || hospitals.isError}
          riseDelay={list.length * PIN_STEP_MS + 250}
          peek={peek}
          areaHeight={area}
          label={`${list.length} hospitals near you. Drag up for services, saved prices and every hospital.`}
          onVisible={setSheet}
          handle={
            hospitals.isError ? (
              <View className="gap-3 pt-3.5">
                <T className="text-coral-ink text-sm leading-5">
                  {errorMessage(hospitals.error)}
                </T>
                <Button
                  label="Try again"
                  variant="secondary"
                  onPress={() => void hospitals.refetch()}
                />
              </View>
            ) : (
              <View className="pt-3.5">
                <T
                  weight="semibold"
                  className="text-[22px] leading-7 tracking-[-0.01em]"
                >
                  {hospitals.data
                    ? `${list.length} ${list.length === 1 ? "hospital" : "hospitals"} near you`
                    : "Finding hospitals near you…"}
                </T>
                <View className="mt-0.5 flex-row flex-wrap items-center gap-x-1.5">
                  <T className="text-[13px] text-muted leading-[18px]">
                    {`Cash prices for up to ${services} services${origin ? ` · near ${origin.label}` : ""}`}
                  </T>
                  {origin && canChangeOrigin ? (
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
                      <T
                        weight="semibold"
                        className="text-[13px] text-accent leading-[18px]"
                      >
                        {origin.here ? "Change" : "Use my location"}
                      </T>
                    </Pressable>
                  ) : null}
                </View>
                {peeking && (fromBills.length > 0 || saved.length > 0) ? (
                  <View className="mt-3 flex-row gap-2">
                    {fromBills[0]?.line.code ? (
                      <MiniCard
                        title="From your bill"
                        body={
                          SERVICES.find(
                            (s) => s.code === fromBills[0]?.line.code,
                          )?.short ?? fromBills[0].line.description
                        }
                        onPress={() =>
                          fromBills[0]?.line.code &&
                          openService(fromBills[0].line.code)
                        }
                      />
                    ) : null}
                    {saved.length > 0 ? (
                      <MiniCard
                        title="Saved"
                        body={
                          SERVICES.find((x) => x.code === saved[0]?.code)
                            ?.short ??
                          saved[0]?.serviceName ??
                          ""
                        }
                        onPress={() =>
                          router.push({
                            pathname: "/price/[hospitalKey]",
                            params: {
                              hospitalKey: saved[0]?.hospitalKey ?? "",
                              code: saved[0]?.code ?? "",
                            },
                          })
                        }
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            )
          }
        >
          {() => (
            <View>
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
                        <T
                          className="shrink text-muted text-xs"
                          numberOfLines={1}
                        >
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

              <View className="mt-[18px] gap-2.5">
                <SectionTitle>Services</SectionTitle>
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

              {list.length > 0 ? (
                <Section title="Hospitals, nearest first">
                  {list.map((h, i) => (
                    <ListRow
                      key={h.hospitalKey}
                      icon="landmark"
                      title={h.hospitalName}
                      last={i === list.length - 1}
                      onPress={() => openHospital(h.hospitalKey)}
                    >
                      <T className="text-muted text-xs">
                        {[
                          `${h.distanceMiles.toFixed(1)} mi`,
                          `prices for ${h.services} ${h.services === 1 ? "service" : "services"}`,
                          h.lowestOn > 0 ? `lowest on ${h.lowestOn}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </T>
                    </ListRow>
                  ))}
                </Section>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/scan")}
                className="mt-[18px] flex-row items-center gap-3.5 rounded-2xl bg-secondary px-4 py-3.5"
              >
                <View className="size-10 items-center justify-center rounded-full bg-white">
                  <Icon name="scan" color="#1E3A8A" />
                </View>
                <View className="flex-1 gap-0.5">
                  <T weight="semibold" className="text-base">
                    Have a doctor's order? Scan it
                  </T>
                  <T className="text-[13px] text-secondary-ink leading-[18px]">
                    Opens the camera. Reading the test from an order is coming
                    soon.
                  </T>
                </View>
                <Icon name="chevron" size={16} color="#1E3A8A" />
              </Pressable>

              <View className="gap-1.5 pt-5">
                <T className="text-center text-[11px] text-muted leading-[15px]">
                  Published cash prices are each hospital's own fee. With
                  insurance, ask your plan what you'd owe.
                </T>
                <Disclaimer />
              </View>
            </View>
          )}
        </DragSheet>
      ) : null}
    </View>
  );
}

function MiniCard({
  title,
  body,
  onPress,
}: {
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-11 flex-1 gap-0.5 rounded-[14px] bg-wash px-3 py-2.5"
    >
      <T
        weight="semibold"
        className="text-[11px] text-muted uppercase tracking-[0.02em]"
      >
        {title}
      </T>
      <T weight="semibold" className="text-sm" numberOfLines={1}>
        {body}
      </T>
    </Pressable>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <T
      weight="semibold"
      className="text-[12px] text-muted uppercase tracking-[0.04em]"
    >
      {children}
    </T>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-[18px]">
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
