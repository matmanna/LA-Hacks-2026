import type { Line } from "@betterbill/core";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import {
  Button,
  EditLineSheet,
  Icon,
  Money,
  printedLine,
  Screen,
  StepBar,
  T,
} from "@/components/bb";
import { holdLines } from "@/lib/draft-lines";
import { errorMessage } from "@/lib/errors";
import { lineName, serviceDay } from "@/lib/format";
import { orpc } from "@/utils/orpc";

const FIRST = 5;

// Ask the user to look at lines the reader was unsure of, and at unit counts
// above 1 (easy to misread). This checks the reading, not the charges.
function needsLook(line: Line) {
  return line.confidence < 0.8 || line.units > 1;
}

// L3 Confirm V2, step 1 of 2: did we read the bill right? One card for the
// line that needs a look, then every line with a pencil. Nothing is sent
// here; the care step sends the lines.
export default function Confirm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const bill = detail.data?.bill;

  const [lines, setLines] = useState<Line[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Line | null>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    if (bill && lines === null) setLines(bill.lines);
  }, [bill, lines]);

  const pending = useMemo(
    () => (lines ?? []).filter((l) => needsLook(l) && !checked.has(l.id)),
    [lines, checked],
  );
  const look = pending[0];
  const rest = (lines ?? []).filter((l) => !pending.includes(l));
  const shown = all ? rest : rest.slice(0, FIRST);
  // Reading check only: do the lines we read add up to the bill's total?
  const sum = (lines ?? []).reduce((s, l) => s + l.chargeCents, 0);
  const matches = bill ? sum === bill.totals.chargesCents : false;

  // Step 1 only checks our reading; step 2 (care) sends the lines.
  function next() {
    holdLines(id, lines ?? []);
    router.push({ pathname: "/case/[id]/care", params: { id } });
  }

  function mark(lineId: string) {
    setChecked((s) => new Set(s).add(lineId));
  }

  if (!lines) {
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

  return (
    <Screen
      onNav={() => router.replace("/")}
      footer={
        pending.length > 0 ? (
          <>
            <Button variant="disabled" label="Answer the one above first" />
            <Button
              variant="quiet"
              label="Skip, I'll check it later"
              onPress={next}
            />
          </>
        ) : (
          <Button label="Next: what you got" onPress={next} />
        )
      }
    >
      <StepBar step={1} />
      <T
        weight="semibold"
        className="mt-3 text-[28px] leading-[34px] tracking-tight"
      >
        Did we read your bill right?
      </T>
      <T className="mt-1.5 text-base text-muted leading-6">
        We copied these lines from your photo. Fix anything we misread.
      </T>

      {look ? (
        <View
          className="mt-[18px] gap-3 rounded-2xl border border-hairline bg-white p-4"
          style={{
            shadowColor: "#0B1B2B",
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          <View className="flex-row items-center gap-1.5">
            <Icon name="alert" size={16} color="#92400E" stroke={2} />
            <T weight="semibold" className="text-[13px] text-amber-ink">
              Did we read this one right?
            </T>
          </View>
          <View className="gap-1">
            <View className="flex-row justify-between rounded-[10px] bg-paper px-3 py-2.5">
              <T
                className="text-[#2A3440] text-xs"
                style={{ fontFamily: "Courier New" }}
              >
                {printedLine(look).text}
              </T>
              <T
                className="text-[#2A3440] text-xs"
                style={{ fontFamily: "Courier New" }}
              >
                {printedLine(look).amount}
              </T>
            </View>
            <T className="text-muted text-xs">
              From your photo, page {look.source.page}
            </T>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <T weight="semibold" className="text-[15px]">
                {lineName(look)}
              </T>
              <T className="text-[13px] text-muted">
                {look.units > 1
                  ? `We read ${look.units} units. Does your paper bill say ${look.units}?`
                  : "We weren't sure we read this right. Does it match your paper bill?"}
              </T>
            </View>
            <Money cents={look.chargeCents} weight="semibold" />
          </View>
          <View className="flex-row gap-2.5">
            <Button
              label="No, fix it"
              variant="outline"
              className="flex-1"
              icon={<Icon name="pencil" size={16} />}
              onPress={() => setEditing(look)}
            />
            <Button
              label={
                look.units > 1
                  ? `Yes, it says ${look.units}`
                  : "Yes, it matches"
              }
              variant="secondary"
              className="flex-1"
              icon={
                <Icon name="check" size={16} color="#1E3A8A" stroke={2.25} />
              }
              onPress={() => mark(look.id)}
            />
          </View>
        </View>
      ) : null}

      <View className="mt-[22px] flex-row items-center gap-2 border-foreground border-b pb-2.5">
        <T weight="semibold" className="flex-1 text-[13px]">
          {pending.length > 0
            ? "Everything else we read"
            : `All ${lines.length} lines`}
        </T>
        {matches ? (
          <>
            <Icon name="check" size={14} color="#0F9D76" stroke={2.5} />
            <T className="text-[13px] text-muted">Adds up to</T>
          </>
        ) : (
          <T className="text-[13px] text-amber-ink">Bill total</T>
        )}
        {bill ? (
          <Money cents={bill.totals.chargesCents} size={13} weight="semibold" />
        ) : null}
      </View>

      {shown.map((line) => (
        <Pressable
          key={line.id}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${lineName(line)}`}
          onPress={() => setEditing(line)}
          className="min-h-14 flex-row items-center gap-3 border-hairline border-b py-2"
        >
          <View className="flex-1">
            <T weight="medium" className="text-[15px]">
              {lineName(line)}
            </T>
            <T className="text-[13px] text-muted">
              {[
                line.code,
                serviceDay(line.serviceDate),
                checked.has(line.id)
                  ? null
                  : line.units > 1
                    ? `${line.units} units`
                    : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              {checked.has(line.id) ? (
                <T weight="semibold" className="text-[13px] text-mint-ink">
                  {" · Read right"}
                </T>
              ) : null}
            </T>
          </View>
          <Money cents={line.chargeCents} />
          <View className="size-8 items-center justify-center rounded-full bg-wash">
            <Icon name="pencil" size={16} color="#1E4ED8" />
          </View>
        </Pressable>
      ))}

      {rest.length > FIRST ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setAll((a) => !a)}
          className="h-11 justify-center self-start"
        >
          <T weight="semibold" className="text-[15px] text-accent">
            {all ? "Show fewer" : `Show ${rest.length - FIRST} more lines`}
          </T>
        </Pressable>
      ) : null}

      <EditLineSheet
        line={editing}
        onClose={() => setEditing(null)}
        onSave={(next) => {
          setLines((ls) =>
            (ls ?? []).map((l) => (l.id === next.id ? next : l)),
          );
          mark(next.id);
          setEditing(null);
        }}
        onRemove={(lineId) => {
          setLines((ls) => (ls ?? []).filter((l) => l.id !== lineId));
          setEditing(null);
        }}
      />
    </Screen>
  );
}
