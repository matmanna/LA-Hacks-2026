import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { router, SplashScreen, Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Uniwind } from "uniwind";

import { FONTS } from "@/components/bb";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { onReminderTap } from "@/lib/notify";
import { queryClient } from "@/utils/orpc";

// BetterBill is light only (section 8.1).
Uniwind.setTheme("light");
void SplashScreen.preventAutoHideAsync();

// Screens draw their own top bar from the Paper frames. Bills and Prices
// live in the (tabs) group; Account opens from the avatar in their headers.
function StackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="account"
        options={{
          headerShown: true,
          title: "Account",
          headerBackTitle: "Back",
          headerTitleStyle: { fontFamily: "Geist_600SemiBold" },
        }}
      />
      <Stack.Screen name="case/[id]/index" />
      <Stack.Screen
        name="case/[id]/join"
        options={{ presentation: "transparentModal", animation: "fade" }}
      />
      <Stack.Screen
        name="case/[id]/share"
        options={{ presentation: "transparentModal", animation: "fade" }}
      />
    </Stack>
  );
}

export default function Layout() {
  const [loaded, failed] = useFonts(FONTS);

  useEffect(() => {
    if (loaded || failed) void SplashScreen.hideAsync();
  }, [loaded, failed]);

  // A "policy should be ready" reminder opens that bill.
  useEffect(
    () =>
      onReminderTap((caseId) =>
        router.push({ pathname: "/case/[id]", params: { id: caseId } }),
      ),
    [],
  );

  if (!loaded && !failed) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AppThemeProvider>
            <HeroUINativeProvider>
              <StackLayout />
            </HeroUINativeProvider>
          </AppThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
