import {
  searchHospitals,
  searchServices,
} from "@betterbill/core/prices/search";
import { SERVICES } from "@betterbill/core/prices/services";
import { useQueries, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Money, T } from "@/components/bb";
import { useOrigin } from "@/lib/origin";
import { orpc } from "@/utils/orpc";

// Price D1: search services (plain words or code) and hospitals (by name).
// A service shows how many hospitals near you publish it and the lowest
// published cash price; a hospital shows its distance and price count.
export default function PriceSearch() {
  const insets = useSafeAreaInsets();
  const origin = useOrigin();
  const [query, setQuery] = useState("");
  const results = searchServices(query);
  const hospitalList = useQuery(
    orpc.price.hospitals.queryOptions({
      input: { lat: origin?.lat ?? 0, lng: origin?.lng ?? 0 },
      enabled: origin !== null,
    }),
  );
  const hospitals = searchHospitals(query, hospitalList.data ?? []);
  const nearby = useQueries({
    queries: results.map((s) =>
      orpc.price.nearby.queryOptions({
        input: {
          code: s.code,
          lat: origin?.lat ?? 0,
          lng: origin?.lng ?? 0,
        },
        enabled: origin !== null,
      }),
    ),
  });

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 14 }}>
      <StatusBar style="dark" />
      <View className="flex-row items-center gap-3 px-5">
        <View className="h-[46px] flex-1 flex-row items-center gap-2.5 rounded-full border-2 border-accent bg-wash pr-3.5 pl-4">
          <Icon name="search" size={18} color="#5B6B7C" stroke={2} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Service or hospital"
            placeholderTextColor="#8A97A6"
            returnKeyType="search"
            accessibilityLabel="Search a service or hospital"
            className="h-full flex-1 text-base text-foreground"
            style={{ fontFamily: "Geist_400Regular", outlineWidth: 0 }}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear"
              hitSlop={12}
              onPress={() => setQuery("")}
              className="size-5 items-center justify-center rounded-full bg-[#C8D1DC]"
            >
              <Icon name="close" size={10} color="#FFFFFF" stroke={3.5} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          className="min-h-11 justify-center"
        >
          <T weight="medium" className="text-accent text-base">
            Cancel
          </T>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-5 pt-1.5 pb-8"
        accessibilityLiveRegion="polite"
      >
        {results.length > 0 ? <Heading>Services</Heading> : null}
        {results.map((s, i) => {
          const data = nearby[i]?.data;
          const low = data?.summary.lowCents ?? null;
          return (
            <Pressable
              key={s.code}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/price/map",
                  params: { code: s.code },
                })
              }
              className="flex-row items-center gap-3 border-[#EEF0F3] border-b py-[13px]"
            >
              <View className="flex-1 gap-0.5">
                <T weight="semibold" className="text-base">
                  {s.name}
                </T>
                <View className="flex-row flex-wrap items-center gap-1">
                  <T className="text-[13px] text-muted">
                    {data
                      ? `CPT ${s.code} · ${data.summary.hospitals} ${data.summary.hospitals === 1 ? "hospital" : "hospitals"} near you${low === null ? "" : " · from"}`
                      : `CPT ${s.code}`}
                  </T>
                  {low === null ? null : (
                    <Money
                      cents={low}
                      size={13}
                      weight="semibold"
                      whole
                      className="text-mint-ink"
                      label="Lowest published cash price"
                    />
                  )}
                </View>
              </View>
              <Icon name="chevron" size={16} color="#8A97A6" stroke={2} />
            </Pressable>
          );
        })}

        {hospitals.length > 0 ? <Heading>Hospitals near you</Heading> : null}
        {hospitals.map((h) => (
          <Pressable
            key={h.hospitalKey}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/price/hospital/[hospitalKey]",
                params: { hospitalKey: h.hospitalKey },
              })
            }
            className="flex-row items-center gap-3 border-[#EEF0F3] border-b py-[13px]"
          >
            <View className="size-9 items-center justify-center rounded-[10px] bg-wash">
              <Icon name="landmark" size={18} color="#334155" />
            </View>
            <View className="flex-1 gap-0.5">
              <T weight="semibold" className="text-base">
                {h.hospitalName}
              </T>
              <T className="text-[13px] text-muted">
                {[
                  `${h.distanceMiles.toFixed(1)} mi`,
                  `prices for ${h.services} ${h.services === 1 ? "service" : "services"}`,
                  h.lowestOn > 0 ? `lowest on ${h.lowestOn}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </T>
            </View>
            <Icon name="chevron" size={16} color="#8A97A6" stroke={2} />
          </Pressable>
        ))}

        {results.length === 0 && hospitals.length === 0 ? (
          <View className="gap-0.5 border-[#EEF0F3] border-b py-[13px]">
            <T weight="semibold" className="text-base text-muted">
              {`"${query.trim()}"`}
            </T>
            <T className="text-[13px] text-muted">
              {`Not on file yet. We have prices for ${SERVICES.length} services at ${hospitalList.data?.length ?? 0} hospitals so far.`}
            </T>
          </View>
        ) : null}

        <T className="mt-2.5 text-[13px] text-muted leading-[18px]">
          Plain words work: "blood test", "CT head", "ER visit", or a hospital's
          name.
        </T>
      </ScrollView>
    </View>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <T
      weight="semibold"
      className="pt-3 text-[12px] text-muted uppercase tracking-[0.04em]"
    >
      {children}
    </T>
  );
}
