import type { AuditResult, Lever } from "@betterbill/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { Button, Icon, Screen, T } from "@/components/bb";
import { errorMessage } from "@/lib/errors";
import { serviceDay } from "@/lib/format";
import { client, orpc } from "@/utils/orpc";

const R = 26;
const C = 2 * Math.PI * R;

// L4 Checking: runs the audit while four checks fill in, then moves on.
export default function Checking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const audit = useMutation({
    mutationFn: () => client.audit.run({ caseId: id }),
  });

  // Run once on open (mutate is stable).
  const { mutate: run } = audit;
  useEffect(() => run(), [run]);

  const result = audit.data as AuditResult | undefined;
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => results(id), 1600);
    return () => clearTimeout(t);
  }, [result, id]);

  const bill = detail.data?.bill;
  const hasEob = Boolean(detail.data?.eob);
  const count = (lever: Lever) =>
    result?.flags.filter((f) => f.lever === lever).length ?? 0;
  const price = result?.flags.find((f) => f.lever === "published_price");

  return (
    <Screen
      nav={null}
      scroll={false}
      footer={
        audit.isError ? (
          <Button label="Try again" onPress={() => audit.mutate()} />
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={!result}
            onPress={() => results(id)}
            className="h-11 items-center justify-center"
          >
            <T className={cn("text-sm", result ? "text-accent" : "text-muted")}>
              See results
            </T>
          </Pressable>
        )
      }
    >
      <View className="gap-1 pt-6">
        <T className="text-[13px] text-muted">
          {[
            bill?.hospital.name,
            serviceDay(bill?.lines[0]?.serviceDate ?? null),
          ]
            .filter(Boolean)
            .join(" · ")}
        </T>
        <T
          weight="semibold"
          className="text-[28px] leading-[34px] tracking-tight"
        >
          Checking your bill
        </T>
      </View>

      <View className="mt-5 flex-row flex-wrap gap-3">
        <Tile
          title="Duplicates"
          delay={0}
          done={Boolean(result)}
          status={result ? found(count("duplicate")) : "Looking"}
          warn={count("duplicate") > 0}
        />
        <Tile
          title="Units"
          delay={400}
          done={Boolean(result)}
          status={result ? found(count("units")) : "Looking"}
          warn={count("units") > 0}
        />
        <Tile
          title="Hospital price"
          delay={800}
          done={Boolean(result)}
          status={
            result
              ? found(count("published_price"))
              : `Comparing ${bill?.lines.length ?? ""} lines`
          }
          warn={count("published_price") > 0}
        />
        {hasEob ? (
          <Tile
            title="Insurance match"
            delay={1200}
            done={Boolean(result)}
            status={result ? found(count("eob_mismatch")) : "Matching"}
            warn={count("eob_mismatch") > 0}
          />
        ) : (
          <View className="min-w-[45%] flex-1 gap-2.5 rounded-2xl border border-[#C8D1DC] border-dashed bg-wash p-3.5">
            <T weight="semibold" className="text-[15px]">
              Insurance match
            </T>
            <View className="flex-row items-center gap-2.5">
              <View className="size-16 items-center justify-center rounded-full border-[#C8D1DC] border-[6px] border-dashed">
                <Icon name="dash" color="#5B6B7C" stroke={3} />
              </View>
              <T className="flex-1 text-[13px] text-muted leading-[18px]">
                No insurance letter.{" "}
                <T
                  weight="semibold"
                  className="text-[13px] text-accent"
                  onPress={() => router.push("/scan")}
                >
                  Add one
                </T>
              </T>
            </View>
          </View>
        )}
      </View>

      {price?.evidence.capturedAt ? (
        <View className="mt-5 gap-2.5 rounded-2xl bg-secondary p-4">
          <View className="flex-row items-center gap-2.5">
            <View className="size-9 items-center justify-center rounded-[10px] bg-white">
              <Icon name="landmark" color="#1E3A8A" />
            </View>
            <View className="flex-1">
              <T weight="semibold" className="text-[15px] text-secondary-ink">
                {bill?.hospital.name}'s own price file
              </T>
              <T className="text-secondary-ink text-xs">
                We read it {serviceDay(price.evidence.capturedAt.slice(0, 10))}
              </T>
            </View>
          </View>
          <T className="rounded-[10px] bg-white px-3 py-2.5 text-[13px] text-slate-ink">
            {price.evidence.detail}
          </T>
        </View>
      ) : null}

      {audit.isError ? (
        <T className="mt-4 text-coral-ink text-sm">
          {errorMessage(audit.error)}
        </T>
      ) : null}
    </Screen>
  );
}

function results(id: string) {
  router.replace({ pathname: "/case/[id]/results", params: { id } });
}

function found(n: number) {
  return n === 0 ? "Nothing found" : `${n} to ask about`;
}

function Tile({
  title,
  status,
  done,
  warn,
  delay,
}: {
  title: string;
  status: string;
  done: boolean;
  warn: boolean;
  delay: number;
}) {
  // A rotating arc while the check runs, a full mint ring once it is done.
  // Plain transforms, so it animates on phones and on the web alike.
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = done
      ? withTiming(0, { duration: 200 })
      : withDelay(
          delay,
          withRepeat(
            withTiming(360, { duration: 1100, easing: Easing.linear }),
            -1,
          ),
        );
  }, [done, delay, turn]);
  const spin = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }],
  }));
  return (
    <View className="min-w-[45%] flex-1 gap-2.5 rounded-2xl border border-hairline p-3.5">
      <T weight="semibold" className="text-[15px]">
        {title}
      </T>
      <View className="flex-row items-center gap-2.5">
        <View className="size-16 items-center justify-center">
          <Animated.View style={[{ position: "absolute" }, spin]}>
            <Svg width={64} height={64} viewBox="0 0 64 64">
              <Circle
                cx={32}
                cy={32}
                r={R}
                stroke="#EEF2F6"
                strokeWidth={6}
                fill="none"
              />
              <Circle
                cx={32}
                cy={32}
                r={R}
                stroke={done ? "#0F9D76" : "#1E4ED8"}
                strokeWidth={6}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={done ? undefined : `${C * 0.3} ${C}`}
                transform="rotate(-90 32 32)"
              />
            </Svg>
          </Animated.View>
          {done ? (
            <Icon name="check" size={22} color="#0F9D76" stroke={3} />
          ) : null}
        </View>
        <T
          weight="semibold"
          className={cn(
            "flex-1 text-[13px] leading-[18px]",
            done
              ? warn
                ? "text-coral-ink"
                : "text-mint-ink"
              : "text-secondary-ink",
          )}
        >
          {status}
        </T>
      </View>
    </View>
  );
}
