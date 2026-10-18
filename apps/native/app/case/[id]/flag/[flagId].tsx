import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ActivityIndicator, Pressable, View } from "react-native";

import { Disclaimer, Money, Row, Screen, T, TierBadge } from "@/components/bb";
import { useIsSample } from "@/lib/cases";
import { errorMessage } from "@/lib/errors";
import { lineName, serviceDay } from "@/lib/format";
import { orpc } from "@/utils/orpc";

const EVIDENCE: Record<string, string> = {
  arithmetic: "From your bill",
  rule: "Billing rule",
  quote: "Quoted source",
  price_file: "Hospital price file",
};

// W4 Flag detail: what we found, the lines it is about, and the source.
export default function FlagDetail() {
  const { id, flagId } = useLocalSearchParams<{ id: string; flagId: string }>();
  const isSample = useIsSample(id);
  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const flag = detail.data?.audit?.flags.find((f) => f.id === flagId);
  const lines = (detail.data?.bill?.lines ?? []).filter((l) =>
    flag?.lineIds.includes(l.id),
  );

  if (!flag) {
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

  const { evidence } = flag;
  const first = lines[0];
  return (
    <Screen
      aside={isSample ? "Sample bill" : undefined}
      footer={<Disclaimer />}
    >
      <View className="gap-1.5 pt-2">
        <TierBadge tier={flag.tier} />
        <T weight="semibold" className="text-[26px] leading-8 tracking-tight">
          {flag.title}
        </T>
        {first ? (
          <T className="text-muted text-sm">
            {[lineName(first), first.code, serviceDay(first.serviceDate)]
              .filter(Boolean)
              .join(" · ")}
          </T>
        ) : null}
      </View>

      <View className="pt-5">
        {lines.map((line) => (
          <Row
            key={line.id}
            label={lines.length > 1 ? `${lineName(line)}` : "On your bill"}
            value={<Money cents={line.chargeCents} />}
          />
        ))}
        <Row
          label="To ask about"
          strong
          last
          value={
            <Money
              cents={flag.amountCents}
              weight="semibold"
              className="text-coral-ink"
              label={flag.title}
            />
          }
        />
      </View>

      <T className="pt-4 text-[15px] leading-[22px]">{flag.explanation}</T>

      <View className="pt-5">
        <T weight="semibold" className="pb-0.5 text-[13px] text-muted">
          Source
        </T>
        <Row label="Type" value={EVIDENCE[evidence.kind] ?? evidence.kind} />
        <Row
          label="What it says"
          value={evidence.detail}
          last={!evidence.quote && !evidence.capturedAt}
        />
        {evidence.quote ? (
          <Row
            label="Quote"
            value={`"${evidence.quote}"`}
            last={!evidence.capturedAt}
          />
        ) : null}
        {evidence.capturedAt ? (
          <Row
            label="We checked"
            value={serviceDay(evidence.capturedAt.slice(0, 10)) ?? ""}
            last
          />
        ) : null}
        {evidence.sourceUrl ? (
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              WebBrowser.openBrowserAsync(evidence.sourceUrl ?? "")
            }
            className="h-11 justify-center"
          >
            <T weight="semibold" className="text-accent text-sm">
              Open the source
            </T>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}
