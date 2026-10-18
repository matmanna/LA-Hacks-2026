import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { View } from "react-native";

import { Button, Icon, Screen, T } from "@/components/bb";
import { useIsSample } from "@/lib/cases";
import { errorMessage } from "@/lib/errors";
import { client, orpc } from "@/utils/orpc";

const STEPS = [
  "We email billing to ask for it. You're CC'd.",
  "Your advocate calls to make sure they send it.",
  "Add it here when it comes. We check every line.",
];

// E3 Summary bill V2: one total, no line items. Asking for the itemized bill
// is the first step, not a dead end.
export default function SummaryBill() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isSample = useIsSample(id);
  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const bill = detail.data?.bill;

  // Drafting needs an audited case, so confirm the summary as read and run the
  // audit (it returns the "ask for an itemized bill" flag) before the plan.
  const request = useMutation({
    mutationFn: async () => {
      if (!bill) return;
      if (detail.data?.case.status === "new") {
        await client.bill.confirmLines({ caseId: id, lines: bill.lines });
      }
      if (!detail.data?.audit) await client.audit.run({ caseId: id });
    },
    onSuccess: () =>
      router.push({
        pathname: "/case/[id]/plan",
        params: { id, kind: "itemized" },
      }),
  });

  return (
    <Screen
      onNav={() => router.replace("/scan")}
      aside={isSample ? "Sample bill" : undefined}
      footer={
        <>
          <Button
            label="Request my itemized bill"
            busy={request.isPending}
            onPress={() => request.mutate()}
          />
          <Button
            label="It's in my patient portal"
            variant="quiet"
            onPress={() =>
              router.push({ pathname: "/scan", params: { caseId: id } })
            }
          />
        </>
      }
    >
      <T className="pt-2 text-[15px] text-muted">
        {bill?.hospital.name ?? "Your bill"}
      </T>
      <T
        weight="semibold"
        className="mt-1.5 text-[28px] leading-[34px] tracking-tight"
      >
        First, ask for your itemized bill
      </T>
      <T className="mt-1.5 text-[15px] text-muted leading-[22px]">
        This bill shows one total. An itemized bill lists every charge, so you,
        and the hospital, can check each one.
      </T>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="mt-6 flex-row items-center justify-center gap-3.5"
      >
        <Paper label="What you have" total />
        <Icon name="chevron" size={22} color="#C3CAD3" stroke={2} />
        <Paper label="What you need" />
      </View>

      <View className="mt-5 border-hairline border-t pt-1.5">
        {STEPS.map((step, i) => (
          <View key={step} className="flex-row items-start gap-3 py-2.5">
            <View
              className={cn(
                "size-[22px] items-center justify-center rounded-full",
                i < 2 ? "bg-ink" : "bg-slate-soft",
              )}
            >
              <T
                weight="semibold"
                className={cn("text-xs", i < 2 && "text-white")}
              >
                {i + 1}
              </T>
            </View>
            <T className="flex-1 text-[15px] leading-[21px]">{step}</T>
          </View>
        ))}
      </View>

      {request.isError ? (
        <T className="mt-3 text-coral-ink text-sm">
          {errorMessage(request.error)}
        </T>
      ) : null}
    </Screen>
  );
}

// The two little bills: one total line vs every charge.
function Paper({ label, total = false }: { label: string; total?: boolean }) {
  const widths = total ? [] : [100, 85, 100, 60, 100, 75, 100, 90];
  return (
    <View className="items-center gap-2">
      <View
        className="h-[150px] w-[126px] gap-1.5 rounded-md bg-paper px-[11px] py-3"
        style={{
          shadowColor: "#0B1B2B",
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <View className="h-1 w-[70%] rounded-sm bg-[#2A3440]" />
        {total ? (
          <>
            <View className="flex-1" />
            <View className="h-1 w-1/2 self-end rounded-sm bg-[#2A3440]" />
            <T
              weight="semibold"
              className="self-end text-[#2A3440] text-[10px]"
            >
              Total due
            </T>
          </>
        ) : (
          widths.map((w, i) => (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: static shape
              key={i}
              className="h-1 rounded-sm bg-[#C8D1DC]"
              style={{ width: `${w}%` }}
            />
          ))
        )}
      </View>
      <T
        weight={total ? "regular" : "semibold"}
        className={cn("text-xs", total && "text-muted")}
      >
        {label}
      </T>
    </View>
  );
}
