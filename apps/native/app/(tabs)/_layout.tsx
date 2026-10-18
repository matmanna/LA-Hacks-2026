import { router, Tabs } from "expo-router";
import { cn } from "heroui-native";
import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName, T } from "@/components/bb";

// expo-router bundles React Navigation, so take the tab bar props from Tabs.
type BottomTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: "Bills", icon: "doc" },
  prices: { label: "Prices", icon: "mapPin" },
  billing: { label: "Billing", icon: "card" },
  account: { label: "Account", icon: "user" },
};

// Two destinations on each side of the raised, centred Scan action.
function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tab = (name: string) => {
    const index = state.routes.findIndex((r) => r.name === name);
    const route = state.routes[index];
    if (!route) return null;
    const meta = TABS[route.name];
    if (!meta) return null;
    const active = state.index === index;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={meta.label}
        onPress={() => navigation.navigate(route.name)}
        className="flex-1 items-center gap-[3px]"
      >
        <Icon
          name={meta.icon}
          size={22}
          color={active ? "#0B1B2B" : "#5B6B7C"}
          stroke={active ? 1.9 : 1.75}
        />
        <T
          weight={active ? "semibold" : "medium"}
          className={cn("text-[11px]", active ? "text-ink" : "text-muted")}
        >
          {meta.label}
        </T>
      </Pressable>
    );
  };
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row items-center border-hairline border-t bg-white px-1 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      {tab("index")}
      {tab("prices")}
      <View className="flex-1 items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan a bill"
          onPress={() => router.push("/scan")}
          className="-mt-7 size-[62px] items-center justify-center rounded-full border-[5px] border-white bg-ink"
          style={{
            shadowColor: "#0B1B2B",
            shadowOpacity: 0.25,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 10 },
          }}
        >
          <Icon name="scan" size={26} color="#FFFFFF" />
        </Pressable>
      </View>
      {tab("billing")}
      {tab("account")}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="prices" />
      <Tabs.Screen name="billing" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
