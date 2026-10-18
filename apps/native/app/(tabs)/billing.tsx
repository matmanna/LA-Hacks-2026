import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, View } from "react-native";

import { Button, Icon, Screen, T } from "@/components/bb";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";

import { ENV } from "../../src/env";

export default function Billing() {
  const { data: session } = authClient.useSession();
  const [opening, setOpening] = useState<"checkout" | "portal" | null>(null);

  const open = async (url: string, returnUrl: string) => {
    await WebBrowser.openAuthSessionAsync(url, returnUrl);
  };

  const checkout = async () => {
    setOpening("checkout");
    try {
      const returnUrl = Linking.createURL("/billing");
      const polar = new URL("/polar/success", ENV.EXPO_PUBLIC_SERVER_URL);
      polar.searchParams.set("returnUrl", returnUrl);
      const { data, error } = await authClient.checkout({
        slug: "pro",
        redirect: false,
        successUrl: polar.toString(),
        returnUrl: polar.toString(),
      });
      if (error || !data?.url) {
        Alert.alert(
          "Checkout unavailable",
          error?.message ?? "Unable to create a checkout session.",
        );
        return;
      }
      await open(data.url, returnUrl);
    } finally {
      setOpening(null);
    }
  };

  const portal = async () => {
    setOpening("portal");
    try {
      const returnUrl = Linking.createURL("/billing");
      const { data, error } = await authClient.customer.portal({
        redirect: false,
      });
      if (error || !data?.url) {
        Alert.alert(
          "Portal unavailable",
          error?.message ?? "Unable to open the customer portal.",
        );
        return;
      }
      await open(data.url, returnUrl);
    } finally {
      setOpening(null);
    }
  };

  return (
    <Screen nav={null} tone="wash" className="gap-4 pt-4">
      <View className="gap-1">
        <T
          weight="semibold"
          className="text-[28px] leading-[34px] tracking-[-0.01em]"
        >
          Billing
        </T>
        <T className="text-[15px] text-muted leading-[21px]">
          Manage your BetterBill plan and payment details.
        </T>
      </View>

      {session?.user ? (
        <View className="gap-4">
          <View className="gap-4 rounded-[20px] bg-white p-[18px]">
            <View className="size-11 items-center justify-center rounded-full bg-secondary">
              <Icon name="card" color="#1E3A8A" />
            </View>
            <View className="gap-1">
              <T weight="semibold" className="text-lg">
                BetterBill Pro
              </T>
              <T className="text-muted text-sm leading-5">
                Upgrade through Polar's secure checkout, or manage an existing
                subscription in the customer portal.
              </T>
            </View>
            <Button
              label="Upgrade to Pro"
              busy={opening === "checkout"}
              onPress={() => void checkout()}
            />
            <Button
              label="Manage subscription"
              variant="outline"
              busy={opening === "portal"}
              onPress={() => void portal()}
            />
          </View>
          <View className="rounded-xl bg-amber-soft p-4">
            <T className="text-amber-ink text-sm leading-5">
              Test mode. Payments use Polar's sandbox, so no real money moves.
            </T>
          </View>
        </View>
      ) : (
        <View className="gap-3">
          <View className="rounded-[20px] bg-white p-[18px]">
            <T weight="semibold" className="text-base">
              Sign in to manage billing
            </T>
            <T className="mt-1 text-muted text-sm leading-5">
              Your plan and payment details stay connected to your account.
            </T>
          </View>
          <SignIn />
          <SignUp />
        </View>
      )}
    </Screen>
  );
}
