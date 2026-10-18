import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  CoachPill,
  DarkPhotoSheet,
  DoneButton,
  Icon,
  type IconName,
  PageThumb,
  RoundButton,
  Shutter,
  T,
  TrustLine,
  Viewfinder,
  windowRect,
} from "@/components/bb";
import { isTooDark } from "@/lib/capture-quality";
import { saveCase } from "@/lib/cases";
import { errorMessage } from "@/lib/errors";
import { holdPages } from "@/lib/pending";
import {
  choosePhotos,
  MAX_PAGES,
  type Page,
  takePhotoWithSystemCamera,
  toPage,
} from "@/lib/photos";
import { startSampleBill } from "@/lib/sample";
import { client } from "@/utils/orpc";

const TOP_BAR = 64;
const BOTTOM_RESERVE = 250; // coach pill, trust line, sample, controls

// L1 In-app scanner: a live camera with a page-shaped frame, mint brackets, one
// coaching line, a tray of up to 3 pages, and a too-dark check after each shot.
// With ?caseId=… (Add my itemized bill) the pages go on that same case and
// replace its summary bill.
export default function Scan() {
  const { caseId } = useLocalSearchParams<{ caseId?: string }>();
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFailed, setCameraFailed] = useState(false);
  const [flash, setFlash] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [dark, setDark] = useState(false);
  const [busy, setBusy] = useState<null | "shot" | "send" | "sample">(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(chosen: Page[] | null) {
    if (!chosen || chosen.length === 0) return;
    setError(null);
    setBusy("send");
    try {
      const id = caseId ?? (await client.case.create({})).id;
      if (!caseId) {
        await saveCase({
          id,
          createdAt: new Date().toISOString(),
          label: `Photo, ${chosen.length} page${chosen.length === 1 ? "" : "s"}`,
        });
      }
      holdPages(id, chosen);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: "/case/[id]/reading", params: { id } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function pick(get: () => Promise<Page[] | null>) {
    setError(null);
    try {
      await submit(await get());
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function sample() {
    setError(null);
    setBusy("sample");
    try {
      const id = await startSampleBill();
      router.replace({ pathname: "/case/[id]/reading", params: { id } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function shoot() {
    if (!camera.current || busy || pages.length >= MAX_PAGES) return;
    setError(null);
    setBusy("shot");
    try {
      const photo = await camera.current.takePictureAsync({
        quality: 1,
        exif: true,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const page = await toPage(photo, pages.length + 1);
      setPages((p) => [...p, page]);
      setDark(isTooDark(photo.exif));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function removeLast() {
    Alert.alert(`Remove page ${pages.length}?`, undefined, [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => setPages((p) => p.slice(0, -1)),
      },
    ]);
  }

  const paste = () =>
    router.push({ pathname: "/paste", params: caseId ? { caseId } : {} });
  const title = caseId ? "Add your itemized bill" : "Scan your bill";

  const topBar = (
    <View
      className="absolute inset-x-0 z-10 flex-row items-center justify-between px-5"
      style={{ top: insets.top + 8 }}
    >
      <RoundButton icon="close" label="Close" onPress={() => router.back()} />
      <T weight="semibold" className="text-[15px] text-white">
        {title}
      </T>
      {permission?.granted && !cameraFailed ? (
        <RoundButton
          icon={flash ? "bolt" : "boltOff"}
          label={flash ? "Flash on" : "Flash off"}
          onPress={() => setFlash((f) => !f)}
        />
      ) : (
        <View className="size-11" />
      )}
    </View>
  );

  if (!permission) {
    return <View className="flex-1 bg-ink" />;
  }

  // No camera access (or the camera couldn't start): offer the other ways in.
  if (!permission.granted || cameraFailed) {
    return (
      <View
        className="flex-1 justify-center gap-4 bg-ink px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
      >
        <StatusBar style="light" />
        {topBar}
        <Icon name="scan" size={40} color="#D1FAE5" />
        <T weight="semibold" className="text-[22px] text-white leading-7">
          {cameraFailed
            ? "The camera couldn't start"
            : "Allow camera to scan your bill"}
        </T>
        <T className="text-[15px] text-white/80 leading-[22px]">
          You can also upload a photo or paste the text from your bill.
        </T>
        {error ? <T className="text-coral-soft text-sm">{error}</T> : null}
        <Choice
          label={cameraFailed ? "Use your phone's camera" : "Allow camera"}
          primary
          onPress={() =>
            cameraFailed ? pick(takePhotoWithSystemCamera) : requestPermission()
          }
        />
        <Choice
          label="Upload a photo"
          icon="image"
          onPress={() => pick(choosePhotos)}
        />
        <Choice label="Paste text" icon="clipboard" onPress={paste} />
        {busy === "send" ? <ActivityIndicator color="#FFFFFF" /> : null}
      </View>
    );
  }

  const rect = windowRect(
    frame,
    insets.top + TOP_BAR,
    BOTTOM_RESERVE + insets.bottom,
  );
  const last = pages[pages.length - 1];

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      <CameraView
        ref={camera}
        style={{ position: "absolute", inset: 0 }}
        facing="back"
        flash={flash ? "on" : "off"}
        onMountError={() => setCameraFailed(true)}
      />
      <Viewfinder rect={rect} />
      {topBar}

      <View
        className="absolute inset-x-0 gap-3"
        style={{ top: rect.y + rect.height + 18 }}
      >
        <CoachPill pages={pages.length} max={MAX_PAGES} />
        <TrustLine />
        {error ? (
          <T className="px-6 text-center text-coral-soft text-sm">{error}</T>
        ) : null}
        {!caseId && pages.length === 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={sample}
            disabled={busy !== null}
            className="h-9 flex-row items-center self-center rounded-full bg-white px-3.5"
          >
            {busy === "sample" ? (
              <ActivityIndicator color="#0B1B2B" />
            ) : (
              <T weight="semibold" className="text-[13px] text-ink">
                Try a sample bill
              </T>
            )}
          </Pressable>
        ) : null}
      </View>

      <View
        className="absolute inset-x-0 flex-row items-center justify-between px-6"
        style={{ bottom: insets.bottom + 20 }}
      >
        <View className="w-[72px] items-start">
          {last ? (
            <PageThumb
              uri={last.imageDataUrl}
              count={pages.length}
              onPress={removeLast}
            />
          ) : (
            <SideButton
              icon="image"
              label="Upload"
              onPress={() => pick(choosePhotos)}
            />
          )}
        </View>
        {pages.length < MAX_PAGES ? (
          <Shutter
            page={pages.length + 1}
            busy={busy === "shot"}
            ready={pages.length > 0}
            onPress={shoot}
          />
        ) : (
          <View className="size-[76px]" />
        )}
        <View className="w-[72px] items-end">
          {pages.length > 0 ? (
            <DoneButton
              count={pages.length}
              busy={busy === "send"}
              onPress={() => submit(pages)}
            />
          ) : (
            <SideButton icon="clipboard" label="Paste" onPress={paste} />
          )}
        </View>
      </View>

      {dark ? (
        <DarkPhotoSheet
          flashOn={flash}
          onRetake={() => {
            setPages((p) => p.slice(0, -1));
            setDark(false);
          }}
          onKeep={() => setDark(false)}
        />
      ) : null}
    </View>
  );
}

function SideButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center gap-1"
    >
      <View className="size-11 items-center justify-center rounded-xl bg-white/15">
        <Icon name={icon} color="#FFFFFF" />
      </View>
      <T className="text-[11px] text-white">{label}</T>
    </Pressable>
  );
}

function Choice({
  label,
  icon,
  primary = false,
  onPress,
}: {
  label: string;
  icon?: IconName;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={
        primary
          ? "h-12 flex-row items-center justify-center gap-2 rounded-xl bg-mint"
          : "h-12 flex-row items-center justify-center gap-2 rounded-xl bg-white/10"
      }
    >
      {icon ? <Icon name={icon} color="#FFFFFF" /> : null}
      <T weight="semibold" className="text-white">
        {label}
      </T>
    </Pressable>
  );
}
