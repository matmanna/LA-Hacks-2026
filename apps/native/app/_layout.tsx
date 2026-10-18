import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Uniwind } from "uniwind";

import { FONTS } from "@/components/bb";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { queryClient } from "@/utils/orpc";

// BetterBill is light only (section 8.1).
Uniwind.setTheme("light");
void SplashScreen.preventAutoHideAsync();

// Screens draw their own top bar from the Paper frames; the older screens
// keep the native header until they are rebuilt.
function StackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="case/[id]"
        options={{ headerShown: true, title: "Your bill" }}
      />
      <Stack.Screen
        name="account"
        options={{ headerShown: true, title: "Account" }}
      />
    </Stack>
  );
}

export default function Layout() {
  const [loaded, failed] = useFonts(FONTS);

  useEffect(() => {
    if (loaded || failed) void SplashScreen.hideAsync();
  }, [loaded, failed]);

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
