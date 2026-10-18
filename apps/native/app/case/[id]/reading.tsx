import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { BillMock, Icon, Money, printedLine, Screen, T } from "@/components/bb";
import { errorMessage } from "@/lib/errors";
import { lineName, serviceDay } from "@/lib/format";
import { peekPages, takePages } from "@/lib/pending";
import { client, orpc } from "@/utils/orpc";

const SHOWN = 4; // lines revealed before moving on
const STEP_MS = 900;

// L2 Reading: shows the bill being read, then the first lines we found, then
// moves on to the lines for the user to confirm.
export default function Reading() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [photo] = useState(() => peekPages(id)?.[0]?.imageDataUrl ?? null);
  const [parsed, setParsed] = useState(photo === null);
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(0);
  const sent = useRef(false);

  // Photos were picked on the scan screen; send them once.
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const pages = takePages(id);
    if (!pages) return;
    client.bill
      .parsePhoto({ caseId: id, pages })
      .then(() => setParsed(true))
      .catch((e) =>
        router.replace({
          pathname: "/case/[id]/cant-read",
          params: { id, reason: errorMessage(e) },
        }),
      );
  }, [id]);

  const detail = useQuery({
    ...orpc.case.get.queryOptions({ input: { caseId: id } }),
    enabled: parsed,
  });
  const lines = detail.data?.bill?.lines ?? [];
  const ready = lines.length > 0;

  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, 2)), STEP_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!ready || step < 2) return;
    const t = setInterval(() => setShown((n) => n + 1), 450);
    return () => clearInterval(t);
  }, [ready, step]);

  const done = ready && shown > Math.min(SHOWN, lines.length);
  const summary = detail.data?.bill?.kind === "summary";
  useEffect(() => {
    if (summary)
      router.replace({ pathname: "/case/[id]/summary", params: { id } });
    else if (done) next(id);
  }, [summary, done, id]);

  const scan = useSharedValue(0);
  useEffect(() => {
    scan.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [scan]);
  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: 12 + scan.value * 168 }],
  }));

  const visible = lines.slice(0, Math.min(shown, SHOWN));

  return (
    <Screen
      nav={null}
      scroll={false}
      footer={
        ready ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => next(id)}
            className="h-11 items-center justify-center"
          >
            <T className="text-accent text-sm">Skip animation</T>
          </Pressable>
        ) : null
      }
    >
      <View className="gap-1 pt-6">
        <T
          weight="semibold"
          className="text-[28px] leading-[34px] tracking-tight"
        >
          Reading your bill
        </T>
        <T className="text-base text-muted leading-6">
          We'll show you every line before checking anything.
        </T>
      </View>

      <View className="mt-4 h-[196px] items-center overflow-hidden rounded-[20px] bg-wash pt-[18px]">
        {photo ? (
          <Image
            source={{ uri: photo }}
            accessibilityLabel="Your bill photo"
            className="h-[220px] w-[300px] rounded"
            resizeMode="cover"
          />
        ) : (
          <BillMock
            size="md"
            className="w-[300px]"
            lines={lines.slice(0, 8).map((l, i) => ({
              ...printedLine(l),
              state:
                i < shown - 1
                  ? "read"
                  : i === shown - 1
                    ? "reading"
                    : undefined,
            }))}
          />
        )}
        <Animated.View
          pointerEvents="none"
          className="absolute right-0 left-0 h-0.5 bg-accent"
          style={scanStyle}
        />
      </View>

      <View className="mt-4 gap-2.5">
        <Step
          state={step > 0 ? "done" : "active"}
          label="Finding line items"
          count={
            ready
              ? `${Math.min(shown, lines.length)} of ${lines.length}`
              : undefined
          }
        />
        <Step
          state={step > 1 && ready ? "done" : step >= 1 ? "active" : "todo"}
          label="Checking the totals"
        />
        <Step
          state={done ? "done" : step >= 2 ? "active" : "todo"}
          label="Getting lines ready for you"
        />
      </View>

      <View className="mt-4 gap-2">
        {visible.map((line, i) => {
          const reading = i === visible.length - 1 && !done;
          return (
            <View
              key={line.id}
              className={cn(
                "flex-row items-center gap-3 rounded-[14px] border px-3.5 py-3",
                reading ? "border-accent bg-secondary" : "border-hairline",
              )}
            >
              <View className="flex-1">
                <T weight="semibold" className="text-[15px]" numberOfLines={1}>
                  {lineName(line)}
                </T>
                <T
                  className={cn(
                    "text-xs",
                    reading ? "text-secondary-ink" : "text-muted",
                  )}
                >
                  {[
                    line.code,
                    serviceDay(line.serviceDate),
                    reading ? "reading" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </T>
              </View>
              <Money cents={line.chargeCents} weight="semibold" />
            </View>
          );
        })}
      </View>

      {detail.isError ? (
        <T className="mt-3 text-coral-ink text-sm">
          {errorMessage(detail.error)}
        </T>
      ) : null}
    </Screen>
  );
}

function next(id: string) {
  router.replace({ pathname: "/case/[id]/phone", params: { id } });
}

function Step({
  state,
  label,
  count,
}: {
  state: "done" | "active" | "todo";
  label: string;
  count?: string;
}) {
  return (
    <View className="flex-row items-center gap-2.5">
      {state === "done" ? (
        <View className="size-[22px] items-center justify-center rounded-full border-2 border-mint">
          <Icon name="check" size={12} color="#0F9D76" stroke={3} />
        </View>
      ) : state === "active" ? (
        <Spin />
      ) : (
        <View className="size-[22px] rounded-full border-2 border-hairline" />
      )}
      <T
        weight={state === "active" ? "semibold" : "regular"}
        className={cn("flex-1 text-sm", state === "todo" && "text-muted")}
      >
        {label}
      </T>
      {count ? <T className="text-muted text-sm">{count}</T> : null}
    </View>
  );
}

function Spin() {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
    );
  }, [turn]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <Icon name="spinner" size={22} color="#1E4ED8" stroke={2.5} />
    </Animated.View>
  );
}
