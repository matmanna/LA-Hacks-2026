import { searchServices } from "@betterbill/core/prices/search";
import { SERVICES } from "@betterbill/core/prices/services";
import { useQueries } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Money, T } from "@/components/bb";
import { useOrigin } from "@/lib/origin";
import { orpc } from "@/utils/orpc";

// Price A1: search the services we have price files for, by plain words or
// code. Each result shows how many hospitals near you publish it and the
// lowest published cash price, from price.nearby.
export default function PriceSearch() {
  const insets = useSafeAreaInsets();
  const origin = useOrigin();
  const [query, setQuery] = useState("");
  const results = searchServices(query);
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
            placeholder="MRI back, blood test, CT head…"
            placeholderTextColor="#8A97A6"
            returnKeyType="search"
            accessibilityLabel="Search a service, test or scan"
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
                      weight="regular"
                      className="text-muted"
                      label="Lowest published cash price"
                    />
                  )}
                </View>
              </View>
              <Icon name="chevron" size={16} color="#8A97A6" stroke={2} />
            </Pressable>
          );
        })}

        {results.length === 0 ? (
          <View className="gap-0.5 border-[#EEF0F3] border-b py-[13px]">
            <T weight="semibold" className="text-base text-muted">
              {`"${query.trim()}"`}
            </T>
            <T className="text-[13px] text-muted">
              {`Not on file yet. We have price files for ${SERVICES.length} services so far.`}
            </T>
          </View>
        ) : null}

        <T className="mt-2.5 text-[13px] text-muted leading-[18px]">
          Plain words work: "blood test", "CT head", "ER visit".
        </T>
      </ScrollView>
    </View>
  );
}
