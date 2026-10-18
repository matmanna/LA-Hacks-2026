import { cn } from "heroui-native";
import {
  ActivityIndicator,
  Image,
  Pressable,
  View,
  type ViewStyle,
} from "react-native";

import { Icon, type IconName } from "./icon";
import { T } from "./t";

const MINT = "#0F9D76";
const LETTER = 8.5 / 11;

export type Rect = { x: number; y: number; width: number; height: number };

// The page-shaped window: letter ratio, 24 px side margins, capped to fit
// between the top bar and the controls.
export function windowRect(
  screen: { width: number; height: number },
  top: number,
  bottomReserve: number,
): Rect {
  let width = screen.width - 48;
  let height = width / LETTER;
  const room = screen.height - top - bottomReserve;
  if (height > room) {
    height = room;
    width = height * LETTER;
  }
  return { x: (screen.width - width) / 2, y: top, width, height };
}

// Dims everything outside the window and draws mint corner brackets on it.
export function Viewfinder({ rect }: { rect: Rect }) {
  const dim = "absolute bg-black/55";
  return (
    <View pointerEvents="none" className="absolute inset-0">
      <View
        className={dim}
        style={{ left: 0, right: 0, top: 0, height: rect.y }}
      />
      <View
        className={dim}
        style={{ left: 0, right: 0, top: rect.y + rect.height, bottom: 0 }}
      />
      <View
        className={dim}
        style={{ left: 0, width: rect.x, top: rect.y, height: rect.height }}
      />
      <View
        className={dim}
        style={{
          left: rect.x + rect.width,
          right: 0,
          top: rect.y,
          height: rect.height,
        }}
      />
      <Bracket rect={rect} corner="tl" />
      <Bracket rect={rect} corner="tr" />
      <Bracket rect={rect} corner="bl" />
      <Bracket rect={rect} corner="br" />
    </View>
  );
}

function Bracket({
  rect,
  corner,
}: {
  rect: Rect;
  corner: "tl" | "tr" | "bl" | "br";
}) {
  const arm = 36;
  const w = 5;
  const left =
    corner[1] === "l" ? rect.x - w / 2 : rect.x + rect.width - arm + w / 2;
  const top =
    corner[0] === "t" ? rect.y - w / 2 : rect.y + rect.height - arm + w / 2;
  const style: ViewStyle = {
    position: "absolute",
    left,
    top,
    width: arm,
    height: arm,
    borderColor: MINT,
    [`border${corner[0] === "t" ? "Top" : "Bottom"}Width`]: w,
    [`border${corner[1] === "l" ? "Left" : "Right"}Width`]: w,
    [`border${corner[0] === "t" ? "Top" : "Bottom"}${corner[1] === "l" ? "Left" : "Right"}Radius`]: 8,
  };
  return <View style={style} />;
}

export function CoachPill({ pages, max }: { pages: number; max: number }) {
  const done = pages > 0;
  const text =
    pages >= max
      ? `${pages} pages added. Tap Done`
      : done
        ? `Page ${pages} added. Add another or tap Done`
        : "Fit the whole page inside the frame";
  return (
    <View
      accessibilityLiveRegion="polite"
      className={cn(
        "flex-row items-center gap-1.5 self-center rounded-full px-3.5 py-2",
        done ? "bg-mint" : "bg-white/15",
      )}
    >
      <Icon name={done ? "check" : "scan"} size={16} color="#FFFFFF" />
      <T weight="medium" className="text-[13px] text-white">
        {text}
      </T>
    </View>
  );
}

export function TrustLine() {
  return (
    <View className="flex-row items-center justify-center gap-1.5 px-6">
      <Icon name="lock" size={12} color="rgba(255,255,255,0.7)" />
      <T className="text-[11px] text-white/70">
        Only your bill is read. Nothing is sent until you confirm.
      </T>
    </View>
  );
}

export function RoundButton({
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
      className="size-11 items-center justify-center rounded-full bg-white/15"
    >
      <Icon name={icon} color="#FFFFFF" />
    </Pressable>
  );
}

export function Shutter({
  page,
  busy,
  ready,
  onPress,
}: {
  page: number;
  busy: boolean;
  ready: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Take a photo of your bill, page ${page}`}
      onPress={onPress}
      disabled={busy}
      className={cn(
        "size-[76px] items-center justify-center rounded-full border-4",
        ready ? "border-mint" : "border-white",
      )}
    >
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View className="size-[60px] rounded-full bg-white" />
      )}
    </Pressable>
  );
}

export function PageThumb({
  uri,
  count,
  onPress,
}: {
  uri: string;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Page ${count}, tap to remove`}
      onPress={onPress}
      className="h-[52px] w-11"
    >
      <Image
        source={{ uri }}
        className="h-[52px] w-11 rounded-md border-2 border-white"
      />
      <View className="absolute -top-2 -right-2 size-5 items-center justify-center rounded-full bg-[#1E4ED8]">
        <T weight="medium" className="text-[11px] text-white">
          {count}
        </T>
      </View>
    </Pressable>
  );
}

export function DoneButton({
  count,
  busy,
  onPress,
}: {
  count: number;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Done, ${count} page${count === 1 ? "" : "s"}`}
      onPress={onPress}
      disabled={busy}
      className="h-11 min-w-[72px] items-center justify-center rounded-full bg-mint px-4"
    >
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <T weight="semibold" className="text-sm text-white">
          Done
        </T>
      )}
    </Pressable>
  );
}

// Shown over the preview when a capture looks too dark to read well.
export function DarkPhotoSheet({
  flashOn,
  onRetake,
  onKeep,
}: {
  flashOn: boolean;
  onRetake: () => void;
  onKeep: () => void;
}) {
  return (
    <View className="absolute inset-x-4 bottom-6 gap-3 rounded-2xl bg-white p-5">
      <T weight="semibold" className="text-base text-ink">
        This photo looks dark
      </T>
      <T className="text-ink/70 text-sm leading-5">
        Dim photos are harder to read.{" "}
        {flashOn
          ? "Try more light or hold the phone steady."
          : "Turn on the flash or move to brighter light."}
      </T>
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          onPress={onRetake}
          className="h-12 flex-1 items-center justify-center rounded-xl bg-[#1E4ED8]"
        >
          <T weight="semibold" className="text-white">
            Retake
          </T>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onKeep}
          className="h-12 flex-1 items-center justify-center rounded-xl bg-[#EEF2FF]"
        >
          <T weight="semibold" className="text-[#1E3A8A]">
            Use anyway
          </T>
        </Pressable>
      </View>
    </View>
  );
}
