import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { cn } from "heroui-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BillMock,
  Icon,
  type IconName,
  SAMPLE_PRINT,
  T,
} from "@/components/bb";
import { saveCase } from "@/lib/cases";
import { errorMessage } from "@/lib/errors";
import { holdPages } from "@/lib/pending";
import { choosePhotos, type Page, takePhoto } from "@/lib/photos";
import { client } from "@/utils/orpc";

const SAMPLE_ID = "SB-01";

// L1 Camera + tips. The shutter opens the phone's camera; the bill drawn here
// shows how to frame the page.
// With ?caseId=… (Add my itemized bill) the pages go on that same case and
// replace its summary bill.
export default function Scan() {
  const { caseId } = useLocalSearchParams<{ caseId?: string }>();
  const insets = useSafeAreaInsets();
  const [tip, setTip] = useState(true);
  const [busy, setBusy] = useState<null | "photo" | "sample">(null);
  const [error, setError] = useState<string | null>(null);

  async function fromPhotos(getPages: () => Promise<Page[] | null>) {
    setError(null);
    try {
      const pages = await getPages();
      if (!pages) return;
      setBusy("photo");
      const id = caseId ?? (await client.case.create({})).id;
      if (!caseId) {
        await saveCase({
          id,
          createdAt: new Date().toISOString(),
          label: `Photo, ${pages.length} page${pages.length === 1 ? "" : "s"}`,
        });
      }
      holdPages(id, pages);
      router.replace({ pathname: "/case/[id]/reading", params: { id } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function sample() {
    setError(null);
    setBusy("sample");
    try {
      const { id } = await client.case.create({ sample: SAMPLE_ID });
      await saveCase({
        id,
        createdAt: new Date().toISOString(),
        label: `Sample bill ${SAMPLE_ID} (synthetic)`,
      });
      router.replace({ pathname: "/case/[id]/reading", params: { id } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View
      className="flex-1 gap-4 bg-ink"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
    >
      <StatusBar style="light" />
      <View className="flex-row items-center justify-between px-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          className="size-11 items-center justify-center rounded-full bg-white/10"
        >
          <Icon name="close" color="#FFFFFF" />
        </Pressable>
        {caseId ? (
          <T weight="semibold" className="text-sm text-white">
            Add your itemized bill
          </T>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={sample}
            disabled={busy !== null}
            className="h-11 flex-row items-center rounded-full bg-white px-3.5"
          >
            {busy === "sample" ? (
              <ActivityIndicator color="#0B1B2B" />
            ) : (
              <T weight="semibold" className="text-ink text-sm">
                Try a sample bill
              </T>
            )}
          </Pressable>
        )}
      </View>

      {tip ? (
        <View className="mx-5 flex-row items-center gap-3 rounded-xl bg-white/10 px-3.5 py-3">
          <Icon name="corners" color="#D1FAE5" />
          <T className="flex-1 text-[13px] text-white leading-[18px]">
            Fit the whole page, totals included. Lay it flat in good light.
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hide tip"
            onPress={() => setTip(false)}
            hitSlop={12}
          >
            <Icon name="close" size={16} color="#B9C4D0" />
          </Pressable>
        </View>
      ) : null}

      <View className="flex-1 items-center justify-center">
        <BillMock
          lines={SAMPLE_PRINT}
          total="12,000.00"
          className="h-[316px] w-[236px]"
          style={{ transform: [{ rotate: "-3deg" }] }}
        />
        <Corner className="top-2 left-14 rounded-tl-md border-t-4 border-l-4" />
        <Corner className="top-2 right-14 rounded-tr-md border-t-4 border-r-4" />
        <Corner className="bottom-2 left-14 rounded-bl-md border-b-4 border-l-4" />
        <Corner className="right-14 bottom-2 rounded-br-md border-r-4 border-b-4" />
      </View>

      {error ? (
        <T className="px-5 text-center text-coral-soft text-sm">{error}</T>
      ) : null}

      <View className="flex-row gap-2 px-5">
        <Mode icon="doc" label="Bill" active />
        <Mode
          icon="image"
          label="Upload"
          onPress={() => fromPhotos(choosePhotos)}
        />
        <Mode
          icon="clipboard"
          label="Paste text"
          onPress={() =>
            router.push({
              pathname: "/paste",
              params: caseId ? { caseId } : {},
            })
          }
        />
      </View>

      <View className="items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take a photo of your bill"
          onPress={() => fromPhotos(takePhoto)}
          disabled={busy !== null}
          className="size-[76px] items-center justify-center rounded-full border-4 border-white"
        >
          {busy === "photo" ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View className="size-[60px] rounded-full bg-white" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <View
      pointerEvents="none"
      className={cn("absolute size-11 border-mint", className)}
    />
  );
}

function Mode({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={cn(
        "h-16 flex-1 items-center justify-center gap-1 rounded-[14px]",
        active ? "bg-white" : "bg-white/10",
      )}
    >
      <Icon name={icon} color={active ? "#0B1B2B" : "#FFFFFF"} />
      <T
        weight={active ? "semibold" : "regular"}
        className={cn("text-xs", active ? "text-ink" : "text-white")}
      >
        {label}
      </T>
    </Pressable>
  );
}
