import type { AssistanceCheck } from "@betterbill/core";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { useEffect, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, View } from "react-native";

import { Button, Icon, Screen, T } from "@/components/bb";
import { heldAnswers, holdResult } from "@/lib/assist";
import { errorMessage } from "@/lib/errors";
import { client, queryClient } from "@/utils/orpc";

const STEP_MS = 800;

const CHECKING: Record<AssistanceCheck["kind"], string> = {
  policy: "Reading the policy…",
  state: "Checking state law…",
  federal: "Checking federal rules…",
  insurance: "Checking the bill's totals…",
  income: "Comparing to the poverty line…",
};

// F2: the agent checks every rule and shows each result, including the ones
// that don't apply. Every row is a real result from assistance.check; the
// rows are revealed one at a time so the patient can follow along.
export default function AssistCheck() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const answers = heldAnswers(id);
  const [shown, setShown] = useState(0);

  const run = useMutation({
    mutationFn: () => {
      if (!answers) throw new Error("Answer the questions first.");
      const { bandLabel: _label, ...input } = answers;
      return client.assistance.check({ caseId: id, ...input });
    },
    onSuccess: (r) => {
      holdResult(id, r);
      void queryClient.invalidateQueries();
    },
  });

  // Runs the check once per visit.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    if (!answers) {
      router.replace({ pathname: "/case/[id]/assist", params: { id } });
      return;
    }
    run.mutate();
  }, []);

  const checks = run.data?.checks ?? [];
  useEffect(() => {
    if (checks.length === 0) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) {
        setShown(checks.length);
        return;
      }
      timer = setInterval(
        () =>
          setShown((n) => {
            if (n + 1 >= checks.length && timer) clearInterval(timer);
            return Math.min(n + 1, checks.length);
          }),
        STEP_MS,
      );
    });
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [checks.length]);

  const done = checks.length > 0 && shown >= checks.length;
  const helping = checks.filter(
    (c) => c.outcome === "may_help" && c.kind !== "income",
  ).length;

  return (
    <Screen
      footer={
        done ? (
          <>
            <T
              weight="semibold"
              className="text-center text-[15px] text-mint-ink"
            >
              {checks.length} checks done · {helping} rule
              {helping === 1 ? "" : "s"} may help you
            </T>
            <Button
              label="See what I may qualify for"
              onPress={() =>
                router.replace({
                  pathname: "/case/[id]/assist-result",
                  params: { id },
                })
              }
            />
          </>
        ) : null
      }
    >
      <T
        weight="semibold"
        className="pt-1 text-[28px] leading-[34px] tracking-tight"
      >
        Checking the rules for you
      </T>
      <T className="mt-1.5 text-[15px] text-muted leading-[22px]">
        Your advocate checks every rule that could lower this bill, and shows
        you what it found.
      </T>

      <View accessibilityLiveRegion="polite" className="mt-3">
        {run.isError ? (
          <T className="pt-4 text-coral-ink text-sm">
            {errorMessage(run.error)}
          </T>
        ) : run.isPending || checks.length === 0 ? (
          <Row title="Getting your bill's rules" sub="Starting…" />
        ) : (
          checks
            .slice(0, Math.min(shown + 1, checks.length))
            .map((c, i) => (
              <Row
                key={c.id}
                title={c.title}
                sub={i < shown ? c.finding : CHECKING[c.kind]}
                outcome={i < shown ? c.outcome : undefined}
              />
            ))
        )}
      </View>
    </Screen>
  );
}

function Row({
  title,
  sub,
  outcome,
}: {
  title: string;
  sub: string;
  outcome?: AssistanceCheck["outcome"];
}) {
  return (
    <View className="flex-row items-start gap-3.5 border-[#EEF0F3] border-b py-3">
      <View className="size-[26px] items-center justify-center">
        {outcome === undefined ? (
          <ActivityIndicator size="small" color="#1E4ED8" />
        ) : (
          <View
            className={cn(
              "size-[26px] items-center justify-center rounded-full",
              outcome === "may_help" && "bg-mint",
              outcome === "not_applicable" && "bg-slate-soft",
              outcome === "needs_info" && "bg-amber-soft",
            )}
          >
            {outcome === "may_help" ? (
              <Icon name="check" size={14} color="#FFFFFF" stroke={3} />
            ) : outcome === "not_applicable" ? (
              <Icon name="minus" size={14} color="#5B6B7C" stroke={3} />
            ) : (
              <T weight="semibold" className="text-[13px] text-amber-ink">
                ?
              </T>
            )}
          </View>
        )}
      </View>
      <View className="flex-1">
        <T weight="semibold" className="text-base leading-[22px]">
          {title}
        </T>
        <T
          className={cn(
            "mt-0.5 text-[13px] leading-[18px]",
            outcome === undefined && "text-accent",
            outcome === "may_help" && "text-mint-ink",
            outcome === "not_applicable" && "text-muted",
            outcome === "needs_info" && "text-amber-ink",
          )}
        >
          {sub}
        </T>
      </View>
    </View>
  );
}
