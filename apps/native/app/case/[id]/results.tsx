import type { Assistance } from "@betterbill/core";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";

import {
  Button,
  Disclaimer,
  Icon,
  Money,
  Receipt,
  Screen,
  ShareButton,
  T,
  TierBadge,
} from "@/components/bb";
import { isHelpRule, STATE_NAMES } from "@/lib/assist";
import { useIsSample } from "@/lib/cases";
import { errorMessage } from "@/lib/errors";
import { serviceDay } from "@/lib/format";
import { orpc } from "@/utils/orpc";

const FIRST = 3; // at most 3 flags before "See all" (section 8.5)

// L5 V2/V3: the "help paying" card. Before the questions it invites them;
// after, it shows what the patient may qualify for.
function helpCard(a: Assistance, state: string | null | undefined) {
  const sources = (a.checks ?? [])
    .filter(
      (c) =>
        isHelpRule(c.id) &&
        c.outcome !== "not_applicable" &&
        !c.finding.startsWith("Not on file"),
    )
    .map((c) =>
      c.kind === "state" && state && STATE_NAMES[state]
        ? `${STATE_NAMES[state]} law`
        : c.title.replace(/ assistance policy$/, " policy"),
    );
  const from = sources.length ? `${sources.join(" and ")}. ` : "";
  if (a.status === "likely")
    return {
      title: "You may qualify for free care",
      note: `${from}See why.`,
      path: "/case/[id]/assist-result" as const,
    };
  if (a.status === "possible")
    return {
      title: "A discount may apply",
      note: `${from}See why.`,
      path: "/case/[id]/assist-result" as const,
    };
  if (a.asksIncome)
    return {
      title: "You may get free or cheaper care",
      note: `${from}Check in 30 seconds.`,
      path: "/case/[id]/assist" as const,
    };
  return null;
}

// L5 Results: the fair balance and what to ask billing about. Every amount
// comes from the audit; nothing here is computed.
export default function Results() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const audit = detail.data?.audit;
  const bill = detail.data?.bill;
  const isSample = useIsSample(id);

  if (!audit) {
    return (
      <Screen>
        {detail.isError ? (
          <T className="pt-6 text-coral-ink">{errorMessage(detail.error)}</T>
        ) : (
          <ActivityIndicator className="pt-10" color="#1E4ED8" />
        )}
      </Screen>
    );
  }

  const { balance, flags } = audit;
  const assistance = audit.savings.assistance;
  const help = helpCard(assistance, bill?.hospital.state);
  return (
    <Screen
      onNav={() => router.replace("/")}
      aside={isSample ? "Sample bill" : undefined}
      action={<ShareButton id={id} />}
      footer={
        <>
          {flags.length > 0 ? (
            <Button
              label="Handle it for me"
              onPress={() =>
                router.push({ pathname: "/case/[id]/plan", params: { id } })
              }
            />
          ) : null}
          <T className="text-center text-muted text-xs leading-4">
            {flags.length > 0
              ? "Your advocate calls and emails billing, and texts you updates."
              : "Nothing looks wrong on the lines you confirmed."}
          </T>
          <Disclaimer />
        </>
      }
    >
      <View className="mt-1 gap-1 rounded-3xl bg-ink p-6">
        <T className="text-ink-muted text-sm">
          {[
            bill?.hospital.name,
            serviceDay(bill?.lines[0]?.serviceDate ?? null),
          ]
            .filter(Boolean)
            .join(" · ")}
        </T>
        <T
          weight="serif"
          className="pt-2 text-[32px] text-white leading-[38px]"
        >
          Your fair balance
        </T>
        <Money
          cents={balance.fairBalanceCents}
          size={52}
          weight="semibold"
          className="text-white"
          label="Your fair balance"
        />
        <View className="flex-row items-center justify-between pt-3">
          {balance.lessThanBilledCents > 0 ? (
            <View className="rounded-full bg-mint-soft px-3 py-1.5">
              <Money
                cents={-balance.lessThanBilledCents}
                size={14}
                weight="semibold"
                className="text-mint-ink"
                label="Less than billed"
              />
            </View>
          ) : (
            <View />
          )}
          <View className="flex-row items-center gap-1">
            <T className="text-[13px] text-ink-muted">Billed</T>
            <Money
              cents={balance.billedCents}
              size={13}
              className="text-ink-muted"
            />
            {balance.isEstimate ? (
              <T className="text-[13px] text-ink-muted">· estimate</T>
            ) : null}
          </View>
        </View>
        {assistance.freeCare &&
        balance.fairBalanceLowCents < balance.fairBalanceCents ? (
          <View className="mt-3 flex-row items-start gap-2.5 border-white/10 border-t pt-3">
            <View className="pt-0.5">
              <Icon name="shield" size={16} color="#6EE7B7" stroke={2} />
            </View>
            <View className="flex-1 gap-0.5">
              <View className="flex-row items-center gap-1">
                <T weight="semibold" className="text-mint-soft text-sm">
                  Could be
                </T>
                <Money
                  cents={balance.fairBalanceLowCents}
                  size={14}
                  weight="semibold"
                  className="text-mint-soft"
                  label="Fair balance if you qualify for free care, estimate"
                />
              </View>
              <T className="text-[13px] text-ink-muted">
                If you qualify for free care · estimate
              </T>
            </View>
          </View>
        ) : null}
      </View>

      <T weight="semibold" className="pt-5 pb-1 text-[22px] leading-7">
        {flags.length === 0
          ? "Nothing to ask about"
          : `${flags.length} thing${flags.length === 1 ? "" : "s"} to ask about`}
      </T>
      {flags.slice(0, FIRST).map((flag) => (
        <Pressable
          key={flag.id}
          accessibilityRole="button"
          accessibilityHint="Shows the evidence"
          onPress={() =>
            router.push({
              pathname: "/case/[id]/flag/[flagId]",
              params: { id, flagId: flag.id },
            })
          }
          className="flex-row items-center gap-3 border-hairline border-b py-4"
        >
          <View className="flex-1 gap-1">
            <T weight="semibold" className="text-base leading-5">
              {flag.title}
            </T>
            <TierBadge tier={flag.tier} />
          </View>
          <Money
            cents={flag.amountCents}
            size={16}
            weight="semibold"
            className="text-coral-ink"
            label={flag.title}
          />
          <Icon name="chevron" size={16} color="#5B6B7C" />
        </Pressable>
      ))}
      {flags.length > FIRST ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: "/case/[id]", params: { id } })
          }
          className="h-11 justify-center"
        >
          <T weight="semibold" className="text-[15px] text-accent">
            See all {flags.length}
          </T>
        </Pressable>
      ) : null}

      {help ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: help.path, params: { id } })}
          className="mt-5 flex-row items-center gap-3.5 rounded-2xl bg-[#EEF7F3] px-4 py-3.5"
        >
          <View className="size-10 items-center justify-center rounded-full bg-mint-soft">
            <Icon name="shieldCheck" size={20} color="#065F46" />
          </View>
          <View className="flex-1 gap-0.5">
            <T weight="semibold" className="text-base">
              {help.title}
            </T>
            <T className="text-[#3E5A50] text-[13px] leading-[18px]">
              {help.note}
            </T>
          </View>
          <Icon name="chevron" size={16} color="#3E5A50" />
        </Pressable>
      ) : null}

      <Receipt
        id={id}
        lines={bill?.lines.length ?? 0}
        policyRead={
          assistance.checks?.find(
            (c) => c.id === "policy" && !c.finding.startsWith("Not on file"),
          )?.title
        }
      />
    </Screen>
  );
}
