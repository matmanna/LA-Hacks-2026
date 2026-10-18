import type { Line } from "@betterbill/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Button, Icon, Money, Screen, StepBar, T } from "@/components/bb";
import { heldLines } from "@/lib/draft-lines";
import { errorMessage } from "@/lib/errors";
import { lineName, serviceDay } from "@/lib/format";
import { client, orpc } from "@/utils/orpc";

// L3b, step 2 of 2: did you get all of these? The patient marks services they
// did not receive; confirmLines sends them as notReceived (patient-reported).
export default function Care() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const lines: Line[] = heldLines(id) ?? detail.data?.bill?.lines ?? [];
  const [missing, setMissing] = useState<Set<string>>(new Set());

  const confirm = useMutation({
    mutationFn: () =>
      client.bill.confirmLines({
        caseId: id,
        lines: lines.map((l) => ({ ...l, notReceived: missing.has(l.id) })),
        eob: detail.data?.eob ?? null,
      }),
    onSuccess: () =>
      router.replace({ pathname: "/case/[id]/checking", params: { id } }),
  });

  function toggle(lineId: string) {
    setMissing((s) => {
      const next = new Set(s);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }

  const n = missing.size;
  return (
    <Screen
      footer={
        <>
          <T
            className={cn(
              "pb-1 text-center text-[13px] leading-[18px]",
              n > 0 ? "text-coral-ink" : "text-muted",
            )}
          >
            {n === 0
              ? "Not sure about something? Leave it as Got it."
              : `${n} marked. We'll ask billing to show ${n === 1 ? "it" : "them"} in your records.`}
          </T>
          <Button
            label="Check my bill"
            busy={confirm.isPending}
            onPress={() => confirm.mutate()}
          />
        </>
      }
    >
      <StepBar step={2} />
      <T
        weight="semibold"
        className="mt-3 text-[28px] leading-[34px] tracking-tight"
      >
        Did you get all of these?
      </T>
      <T className="mt-1.5 text-base text-muted leading-6">
        Tap anything you didn't receive. We'll ask billing to show it in your
        records.
      </T>

      <View className="mt-4 border-hairline border-t">
        {lines.map((line) => {
          const off = missing.has(line.id);
          return (
            <Pressable
              key={line.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !off }}
              accessibilityLabel={`${lineName(line)}. ${off ? "You didn't get this" : "Got it"}`}
              onPress={() => toggle(line.id)}
              className="min-h-14 flex-row items-center gap-2.5 border-hairline border-b py-2.5"
            >
              <View className="flex-1">
                <T className="text-base">{lineName(line)}</T>
                <View className="flex-row items-center gap-1">
                  <T className="text-[13px] text-muted">
                    {serviceDay(line.serviceDate) ?? ""} ·
                  </T>
                  <Money
                    cents={line.chargeCents}
                    size={13}
                    weight="regular"
                    className="text-muted"
                  />
                </View>
              </View>
              {off ? (
                <View className="h-[30px] flex-row items-center rounded-full bg-coral-soft px-3">
                  <T weight="semibold" className="text-[13px] text-coral-ink">
                    Didn't get this
                  </T>
                </View>
              ) : (
                <View className="h-[30px] flex-row items-center gap-1 rounded-full border border-[#D5DAE1] px-3">
                  <Icon name="check" size={13} color="#0B1B2B" stroke={2.5} />
                  <T weight="semibold" className="text-[13px]">
                    Got it
                  </T>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {confirm.isError ? (
        <T className="mt-3 text-coral-ink text-sm">
          {errorMessage(confirm.error)}
        </T>
      ) : null}
    </Screen>
  );
}
