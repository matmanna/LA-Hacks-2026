import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { Pressable, View } from "react-native";

import { Button, Icon, Money, Screen, T } from "@/components/bb";
import { useIsSample } from "@/lib/cases";
import { serviceDay } from "@/lib/format";
import { orpc } from "@/utils/orpc";

const STEPS = [
  "Your advocate calls billing and brings you on the line",
  "We email the request, CC you, and ask them to send it to you",
  "When it reaches your inbox, forward or scan it and we check every line",
];

// E3 Summary bill: totals only, so nothing can be checked yet. Asks for the
// itemized bill instead.
export default function SummaryBill() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isSample = useIsSample(id);
  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const bill = detail.data?.bill;

  return (
    <Screen
      onNav={() => router.replace("/scan")}
      aside={isSample ? "Sample bill" : undefined}
      footer={
        <>
          <Button
            label="Request my itemized bill"
            onPress={() =>
              router.push({
                pathname: "/case/[id]/plan",
                params: { id, kind: "itemized" },
              })
            }
          />
          <Button
            label="I have another page"
            variant="quiet"
            onPress={() => router.replace("/scan")}
          />
        </>
      }
    >
      <View className="mt-1 gap-1 rounded-3xl bg-ink p-[22px]">
        <T className="text-ink-muted text-sm">
          {[bill?.hospital.name, serviceDay(bill?.statementDate ?? null)]
            .filter(Boolean)
            .join(" · ")}
        </T>
        <T weight="serif" className="pt-1.5 text-[30px] text-white leading-9">
          Amount due
        </T>
        {bill ? (
          <Money
            cents={bill.totals.dueCents}
            size={44}
            weight="semibold"
            className="text-white"
            label="Amount due"
          />
        ) : null}
        <View className="mt-2 flex-row self-start rounded-full bg-white/10 px-2.5 py-1">
          <Icon name="alert" size={14} color="#FFFFFF" stroke={2} />
          <T className="pl-1.5 text-[13px] text-white">
            Totals only, no line items
          </T>
        </View>
      </View>

      <View className="gap-1.5 pt-[18px]">
        <T weight="semibold" className="text-2xl leading-[30px] tracking-tight">
          We can't check this yet
        </T>
        <T className="text-[15px] text-muted leading-[22px]">
          This bill shows a total, not each service. We need the itemized bill
          to find mistakes.
        </T>
      </View>

      <View className="pt-1.5">
        {STEPS.map((step, i) => (
          <View
            key={step}
            className={cn(
              "flex-row items-center gap-3 py-[13px]",
              i < STEPS.length - 1 && "border-hairline border-b",
            )}
          >
            <View
              className={cn(
                "size-[26px] items-center justify-center rounded-full",
                i < 2 ? "bg-ink" : "bg-wash",
              )}
            >
              <T
                weight="semibold"
                className={cn("text-xs", i < 2 && "text-white")}
              >
                {i + 1}
              </T>
            </View>
            <T className="flex-1 text-[15px]">{step}</T>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/scan")}
        className="mt-2 flex-row items-center gap-3 rounded-2xl bg-wash p-3.5"
      >
        <Icon name="monitor" color="#1E4ED8" />
        <View className="flex-1 gap-0.5">
          <T weight="semibold" className="text-[15px]">
            Check your patient portal first
          </T>
          <T className="text-[13px] text-muted leading-[18px]">
            Your itemized bill may already be there. Download it and upload it
            here.
          </T>
        </View>
        <Icon name="chevron" size={16} color="#5B6B7C" />
      </Pressable>
    </Screen>
  );
}
