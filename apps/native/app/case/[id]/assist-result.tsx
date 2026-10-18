import type { AssistanceCheck } from "@betterbill/core";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { cn } from "heroui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Button, Choice, Disclaimer, Icon, Screen, T } from "@/components/bb";
import {
  heldAnswers,
  heldResult,
  holdAnswers,
  isHelpRule,
  STATE_NAMES,
} from "@/lib/assist";
import { orpc } from "@/utils/orpc";

// F3: what the patient may qualify for, with the exact quotes and links.
// Always an estimate: the hospital decides.
export default function AssistResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const result = heldResult(id) ?? detail.data?.audit?.savings.assistance;
  const answers = heldAnswers(id);
  const [costs, setCosts] = useState<"yes" | "no" | "unsure" | null>(null);
  const state = detail.data?.bill?.hospital.state ?? null;
  if (!result) return <Screen>{null}</Screen>;

  const checks = result.checks ?? [];
  const stateRule = checks.find((c) => c.id.startsWith("state:"));
  const asksCosts =
    result.status === "unknown" &&
    stateRule?.outcome === "needs_info" &&
    answers?.insurance !== undefined &&
    answers.insurance !== "none";
  const kind =
    result.status === "likely"
      ? "free"
      : result.status === "possible"
        ? "discount"
        : asksCosts
          ? "ask"
          : "none";
  const title = {
    free: "You may qualify for free care",
    discount: "A discount may apply",
    ask: "We need one more answer",
    none: "We didn't find free care at your income",
  }[kind];
  const quotes = checks.filter(
    (c) => isHelpRule(c.id) && c.outcome === "may_help" && c.source?.quote,
  );
  const hospital = detail.data?.bill?.hospital.name ?? "The hospital";

  function answerCosts(value: "yes" | "no" | "unsure") {
    setCosts(value);
    if (!answers || value === "unsure") return;
    holdAnswers(id, { ...answers, highCosts: value === "yes" });
    router.replace({ pathname: "/case/[id]/assist-check", params: { id } });
  }

  return (
    <Screen
      footer={
        <>
          {kind === "free" || kind === "discount" ? (
            <Button
              label="Ask for the application in my letter"
              onPress={() =>
                router.push({ pathname: "/case/[id]/plan", params: { id } })
              }
            />
          ) : null}
          <Button
            label={
              kind === "free" || kind === "discount"
                ? "Not now"
                : "Back to my bill"
            }
            variant="quiet"
            onPress={() =>
              router.replace({ pathname: "/case/[id]/results", params: { id } })
            }
          />
          <Disclaimer />
        </>
      }
    >
      <View
        className={cn(
          "flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1",
          kind === "ask" ? "bg-slate-soft" : "bg-amber-soft",
        )}
      >
        <Icon
          name={kind === "ask" ? "alert" : "circleDashed"}
          size={13}
          color={kind === "ask" ? "#334155" : "#92400E"}
          stroke={2.25}
        />
        <T
          weight="semibold"
          className={cn(
            "text-xs",
            kind === "ask" ? "text-slate-ink" : "text-amber-ink",
          )}
        >
          {kind === "ask" ? "One more question" : "Estimate"}
        </T>
      </View>
      <T
        weight="semibold"
        className="mt-2.5 text-[28px] leading-[34px] tracking-tight"
      >
        {title}
      </T>
      <T className="mt-1.5 text-[15px] text-muted leading-[22px]">
        {kind === "ask"
          ? `With insurance, ${STATE_NAMES[state ?? ""] ?? "state"} law covers you when your costs at the hospital are high for your income.`
          : answers
            ? `Based on your answers: ${answers.householdSize} ${answers.householdSize === 1 ? "person" : "people"}, ${lowerFirst(answers.bandLabel)} a year. ${hospital} makes the final call.`
            : `${hospital} makes the final call.`}
      </T>

      {kind === "ask" ? (
        <View accessibilityRole="radiogroup" className="mt-6 gap-2.5">
          <T weight="semibold" className="text-[17px] leading-[23px]">
            Were your costs at this hospital more than 10% of your family's
            income?
          </T>
          <T className="text-[13px] text-muted leading-[18px]">
            Count what you paid or owe this hospital in the last 12 months,
            after insurance.
          </T>
          <Choice
            label="Yes"
            selected={costs === "yes"}
            onPress={() => answerCosts("yes")}
          />
          <Choice
            label="No"
            selected={costs === "no"}
            onPress={() => answerCosts("no")}
          />
          <Choice
            label="Not sure"
            selected={costs === "unsure"}
            onPress={() => answerCosts("unsure")}
          />
          {costs === "unsure" ? (
            <T className="text-[13px] text-muted leading-[18px]">
              That's okay. You can still ask billing for the application.
            </T>
          ) : null}
          {stateRule?.source ? <Source check={stateRule} /> : null}
        </View>
      ) : null}

      {quotes.map((c) => (
        <View key={c.id} className="mt-5 gap-2">
          <T weight="semibold" className="text-[13px] text-muted">
            {c.kind === "policy"
              ? c.title.replace(/ assistance policy$/, " policy")
              : c.title}
          </T>
          <T className="border-hairline border-l-2 pl-3 text-[15px] leading-[22px]">
            “{c.source?.quote}”
          </T>
          <Source check={c} />
        </View>
      ))}

      {kind === "none" ? (
        <View className="mt-5 flex-row items-start gap-2.5 rounded-[14px] bg-wash p-3.5">
          <Icon name="minus" size={18} color="#5B6B7C" stroke={2} />
          <T className="flex-1 text-slate-ink text-sm leading-5">
            You can still ask billing about a payment plan.
          </T>
        </View>
      ) : null}

      {(result.rights ?? []).length > 0 ? (
        <View className="mt-5 border-[#EEF0F3] border-t pt-1.5">
          <T weight="semibold" className="pt-1 pb-0.5 text-[13px] text-muted">
            Your rights in {STATE_NAMES[state ?? ""] ?? "your state"}
          </T>
          {(result.rights ?? []).map((r) => (
            <View key={r.text} className="flex-row items-start gap-2.5 py-2">
              <Icon name="check" size={18} color="#0F9D76" stroke={2.25} />
              <T className="flex-1 text-[15px] leading-[21px]">{r.text}</T>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

// "Under $109,280" reads "under $109,280" mid-sentence; "$109,280 to …" stays.
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function Source({ check }: { check: AssistanceCheck }) {
  const s = check.source;
  if (!s) return null;
  // Date-only values ("2026-10-18") are calendar days: read them at local
  // noon so they don't shift a day back in US time zones.
  const when = s.capturedAt
    ? ` · captured ${new Date(
        s.capturedAt.length === 10 ? `${s.capturedAt}T12:00:00` : s.capturedAt,
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    : "";
  return (
    <View className="flex-row flex-wrap items-center">
      <T className="text-muted text-xs leading-4">
        {s.label}
        {when}
        {s.url ? " · " : ""}
      </T>
      {s.url ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${s.label}`}
          onPress={() => s.url && WebBrowser.openBrowserAsync(s.url)}
          hitSlop={12}
        >
          <T weight="semibold" className="text-accent text-xs leading-4">
            Open
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}
