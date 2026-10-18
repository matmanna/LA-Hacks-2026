import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { ActivityIndicator, Pressable, View } from "react-native";

import {
  Button,
  Disclaimer,
  Icon,
  Money,
  Progress,
  Screen,
  T,
  TierBadge,
} from "@/components/bb";
import { useIsSample } from "@/lib/cases";
import { errorMessage } from "@/lib/errors";
import { serviceDay } from "@/lib/format";
import { caseStatus, itemizedPending } from "@/lib/status";
import { orpc } from "@/utils/orpc";

const time = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

// W3 Bill detail: where things stand, what we're asking about, and every
// step so far from the case's event log.
export default function BillDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isSample = useIsSample(id);
  const detail = useQuery({
    ...orpc.case.get.queryOptions({ input: { caseId: id } }),
    refetchInterval: 5000,
  });
  const events = useQuery({
    ...orpc.event.list.queryOptions({ input: { caseId: id } }),
    refetchInterval: 5000,
  });

  const data = detail.data;
  if (!data) {
    return (
      <Screen tone="wash">
        {detail.isError ? (
          <T className="pt-6 text-coral-ink">{errorMessage(detail.error)}</T>
        ) : (
          <ActivityIndicator className="pt-10" color="#1E4ED8" />
        )}
      </Screen>
    );
  }

  const { bill, audit } = data;
  const status = caseStatus(data);
  const waiting = itemizedPending(data);
  const log = [...(events.data ?? [])].reverse();
  const next = waiting
    ? null
    : !audit
      ? { label: "Confirm your lines", path: "/case/[id]/confirm" as const }
      : data.case.status === "audited" || data.case.status === "action_pending"
        ? { label: "See the plan", path: "/case/[id]/plan" as const }
        : null;

  return (
    <Screen
      tone="wash"
      onNav={() => router.replace("/")}
      aside={isSample ? "Sample" : undefined}
      footer={
        next ? (
          <Button
            label={next.label}
            onPress={() => router.push({ pathname: next.path, params: { id } })}
          />
        ) : null
      }
    >
      <View className="gap-0.5 pt-1">
        <T weight="serif" className="text-[34px] leading-[38px]">
          {bill?.hospital.name ?? data.case.hospitalName ?? "Your bill"}
        </T>
        <T className="text-muted text-sm">
          {[
            serviceDay(bill?.lines[0]?.serviceDate ?? null) &&
              `Visit ${serviceDay(bill?.lines[0]?.serviceDate ?? null)}`,
            bill?.accountRefMasked && `account ending ${bill.accountRefMasked}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </T>
      </View>

      {waiting ? (
        <ItemizedWaiting id={id} />
      ) : (
        <View className="mt-4 gap-3.5 rounded-3xl bg-ink p-5">
          <View className="gap-1">
            <View className="flex-row items-center gap-2">
              <View className="size-2 rounded-full bg-mint" />
              <T className="text-[13px] text-ink-muted">Now</T>
            </View>
            <T weight="semibold" className="text-[22px] text-white leading-7">
              {status.title}
            </T>
            <T className="text-[#D5DCE4] text-sm leading-5">{status.next}</T>
          </View>
          <Progress step={status.step} label={status.title} />
          {audit ? (
            <View className="flex-row items-center justify-between border-white/10 border-t pt-3">
              <T className="text-ink-muted text-sm">Asking to remove</T>
              <View className="flex-row items-center gap-1">
                <Money
                  cents={audit.balance.lessThanBilledCents}
                  size={14}
                  weight="semibold"
                  className="text-mint-soft"
                />
                <T weight="semibold" className="text-mint-soft text-sm">
                  of
                </T>
                <Money
                  cents={audit.balance.billedCents}
                  size={14}
                  weight="semibold"
                  className="text-mint-soft"
                />
              </View>
            </View>
          ) : null}
        </View>
      )}

      {audit && audit.flags.length > 0 ? (
        <View className="mt-4 rounded-[20px] bg-white px-[18px] py-1.5">
          <T weight="semibold" className="pt-3 pb-1 text-[13px] text-muted">
            What we're asking about
          </T>
          {audit.flags.map((flag, i) => (
            <Pressable
              key={flag.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/case/[id]/flag/[flagId]",
                  params: { id, flagId: flag.id },
                })
              }
              className={cn(
                "flex-row items-center gap-2.5 py-3",
                i < audit.flags.length - 1 && "border-hairline border-b",
              )}
            >
              <View className="flex-1 gap-0.5">
                <T weight="semibold" className="text-[15px]">
                  {flag.title}
                </T>
                <TierBadge tier={flag.tier} />
              </View>
              <Money
                cents={flag.amountCents}
                weight="semibold"
                className="text-coral-ink"
                label={flag.title}
              />
              <Icon name="chevron" size={16} color="#5B6B7C" />
            </Pressable>
          ))}
        </View>
      ) : null}

      {log.length > 0 ? (
        <View className="mt-4 rounded-[20px] bg-white px-[18px] pt-[18px] pb-1.5">
          <T weight="semibold" className="pb-3.5 text-[13px] text-muted">
            What happened
          </T>
          {log.map((e, i) => (
            <View key={e.id} className="flex-row gap-3.5">
              <View className="w-3.5 items-center gap-1 pt-[5px]">
                <View
                  className={cn(
                    "size-2.5 rounded-full",
                    i === 0 ? "bg-ink" : "bg-[#C8D1DC]",
                  )}
                />
                {i < log.length - 1 ? (
                  <View className="w-[1.5px] flex-1 bg-hairline" />
                ) : null}
              </View>
              <T className="flex-1 pb-4 text-sm leading-5">{e.summary}</T>
              <T className="pt-0.5 text-muted text-xs">
                {time.format(new Date(e.at))}
              </T>
            </View>
          ))}
        </View>
      ) : null}

      <View className="pt-4">
        <Disclaimer />
      </View>
    </Screen>
  );
}

const TRACK = ["Asked", "On its way", "We check it"];

// W3 V2: the itemized request went out; the bill comes by email or mail and
// gets added to this same case.
function ItemizedWaiting({ id }: { id: string }) {
  return (
    <View className="mt-4 gap-5">
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Asked, on its way, then we check it"
        className="flex-row items-start"
      >
        {TRACK.map((label, i) => (
          <View key={label} className="flex-1 flex-row items-start">
            {i > 0 ? (
              <View
                className={cn(
                  "mt-[13px] h-0.5 flex-1",
                  i === 1 ? "bg-ink" : "bg-hairline",
                )}
              />
            ) : null}
            <View className="w-20 items-center gap-1.5">
              <View
                className={cn(
                  "size-7 items-center justify-center rounded-full",
                  i === 0 ? "bg-ink" : i === 1 ? "bg-accent" : "bg-slate-soft",
                )}
              >
                {i === 0 ? (
                  <Icon name="check" size={14} color="#FFFFFF" stroke={2.5} />
                ) : (
                  <T
                    weight="semibold"
                    className={cn(
                      "text-[13px]",
                      i === 1 ? "text-white" : "text-muted",
                    )}
                  >
                    {i + 1}
                  </T>
                )}
              </View>
              <T
                weight={i === 1 ? "semibold" : "regular"}
                className={cn("text-center text-xs", i === 2 && "text-muted")}
              >
                {label}
              </T>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({ pathname: "/scan", params: { caseId: id } })
        }
        className="items-center gap-2 rounded-2xl border-[#C8D1DC] border-[1.5px] border-dashed bg-white px-4 py-[22px]"
      >
        <Icon name="doc" size={28} color="#1E4ED8" />
        <T weight="semibold" className="text-base">
          Got it? Add it here
        </T>
        <T className="text-center text-[13px] text-muted leading-[18px]">
          Snap the paper copy, upload the PDF, or paste the text. It goes on
          this same bill.
        </T>
        <View className="mt-1.5 h-11 flex-row items-center rounded-full bg-ink px-[22px]">
          <T weight="semibold" className="text-[15px] text-white">
            Add my itemized bill
          </T>
        </View>
      </Pressable>
    </View>
  );
}
