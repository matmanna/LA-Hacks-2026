import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { color } from "@/lib/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: color.foreground,
          contentStyle: { backgroundColor: color.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "BetterBill" }} />
        <Stack.Screen name="case/[id]" options={{ title: "Your bill" }} />
      </Stack>
    </>
  );
}
