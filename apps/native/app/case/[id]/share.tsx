import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Platform, Pressable, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Icon, T } from "@/components/bb";
import { errorMessage } from "@/lib/errors";
import { client, queryClient } from "@/utils/orpc";

import { ENV } from "../../../src/env";

const SEES = [
  { text: "Where things stand right now", yes: true },
  { text: "What we found, with sources", yes: true },
  { text: "Letters and calls so far", yes: true },
  { text: "Not your income or your answers", yes: false },
];

// S1: share a private, read-only link to the bill's progress (case.share).
// The page reads live data, so the link always shows the latest.
export default function ShareBill() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [copied, setCopied] = useState<string | null>(null);

  const share = useMutation({
    mutationFn: async () => {
      const { path } = await client.case.share({ caseId: id });
      const url = new URL(path, ENV.EXPO_PUBLIC_SERVER_URL).toString();
      // Browsers without a share sheet get the link copied and shown.
      const nav = globalThis.navigator as
        | {
            share?: unknown;
            clipboard?: { writeText(t: string): Promise<void> };
          }
        | undefined;
      if (Platform.OS === "web" && typeof nav?.share !== "function") {
        await nav?.clipboard?.writeText(url).catch(() => undefined);
        return url;
      }
      await Share.share({
        message: `Here's where my hospital bill stands: ${url}`,
        url,
      });
      return null;
    },
    onSuccess: (url) => {
      void queryClient.invalidateQueries();
      if (url) setCopied(url);
      else router.back();
    },
  });

  return (
    <View className="flex-1 justify-end bg-ink/45">
      <Pressable
        accessibilityLabel="Close"
        className="flex-1"
        onPress={() => router.back()}
      />
      <View
        accessibilityViewIsModal
        className="gap-4 rounded-t-3xl bg-white px-6 pt-2.5"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <View className="h-[5px] w-10 self-center rounded-full bg-hairline" />
        <View className="gap-1.5 pt-2">
          <T weight="semibold" className="text-[22px] leading-7">
            Share this bill's progress
          </T>
          <T className="text-[15px] text-muted leading-[22px]">
            Send a private link to family, a caregiver or a lawyer. It always
            shows the latest.
          </T>
        </View>

        <View className="rounded-2xl bg-wash px-4 py-2.5">
          <T weight="semibold" className="pb-1 text-[13px] text-muted">
            What they'll see
          </T>
          {SEES.map((s) => (
            <View key={s.text} className="flex-row items-start gap-2.5 py-1.5">
              <Icon
                name={s.yes ? "check" : "close"}
                size={18}
                color={s.yes ? "#0F9D76" : "#5B6B7C"}
                stroke={2.25}
              />
              <T
                className={
                  s.yes
                    ? "flex-1 text-[15px] leading-[21px]"
                    : "flex-1 text-[15px] text-muted leading-[21px]"
                }
              >
                {s.text}
              </T>
            </View>
          ))}
        </View>

        <T className="text-[13px] text-muted leading-[18px]">
          Anyone with the link can see this bill and its progress. You can stop
          sharing anytime.
        </T>
        {copied ? (
          <View className="gap-1 rounded-2xl bg-mint-soft px-4 py-3">
            <T weight="semibold" className="text-mint-ink text-sm">
              Link copied
            </T>
            <T selectable className="text-mint-ink text-xs leading-4">
              {copied}
            </T>
          </View>
        ) : null}
        {share.isError ? (
          <T className="text-coral-ink text-sm">{errorMessage(share.error)}</T>
        ) : null}

        <View className="gap-1">
          {copied ? (
            <Button
              label="Open link"
              onPress={() => void WebBrowser.openBrowserAsync(copied)}
            />
          ) : (
            <Button
              label="Share link"
              icon={<Icon name="share" size={18} color="#FFFFFF" />}
              busy={share.isPending}
              onPress={() => share.mutate()}
            />
          )}
          <Button
            label={copied ? "Done" : "Cancel"}
            variant="quiet"
            onPress={() => router.back()}
          />
        </View>
      </View>
    </View>
  );
}
