import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import {
  router,
  SplashScreen,
  Stack,
  useRootNavigationState,
} from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Uniwind } from "uniwind";

import { FONTS } from "@/components/bb";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { hasSeenIntro } from "@/lib/intro";
import { onReminderTap } from "@/lib/notify";
import { queryClient } from "@/utils/orpc";

// BetterBill is light only (section 8.1).
Uniwind.setTheme("light");
void SplashScreen.preventAutoHideAsync();

// Screens draw their own top bar from the Paper frames. The five primary
// destinations live in the (tabs) group.
function StackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" options={{ animation: "none" }} />
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
  const ready = loaded || failed;

  // First launch opens the welcome cards. The splash stays up until the flag
  // is read and, when unset, the redirect has been sent, so Bills never
  // flashes first.
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);
  const [redirected, setRedirected] = useState(false);
  const navReady = useRootNavigationState()?.key !== undefined;
  useEffect(() => {
    void hasSeenIntro().then(setIntroSeen);
  }, []);
  useEffect(() => {
    if (introSeen === false && navReady && !redirected) {
      router.replace("/welcome");
      setRedirected(true);
    }
  }, [introSeen, navReady, redirected]);
  const settled = introSeen === true || redirected;

  useEffect(() => {
    if (ready && settled) void SplashScreen.hideAsync();
  }, [ready, settled]);

  // A "policy should be ready" reminder opens that bill.
  useEffect(
    () =>
      onReminderTap((caseId) =>
        router.push({ pathname: "/case/[id]", params: { id: caseId } }),
      ),
    [],
  );

  if (!ready || introSeen === null) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AppThemeProvider>
            <HeroUINativeProvider>
              <StackLayout />
              {settled ? null : (
                <View className="absolute inset-0 bg-background" />
              )}
            </HeroUINativeProvider>
          </AppThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
