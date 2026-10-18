import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { Button, Choice, Icon, Screen, T } from "@/components/bb";
import {
  bandIndexFor,
  bandLabel,
  holdAnswers,
  insuranceOptions,
  STATE_NAMES,
} from "@/lib/assist";
import { errorMessage } from "@/lib/errors";
import { type Insurance, useMyInfo } from "@/lib/my-info";
import { orpc } from "@/utils/orpc";

// F1 V2: a few quick questions. The income chips come from the server for
// this bill and household size; only the chosen range is ever sent.
export default function AssistQuestions() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { info, update } = useMyInfo();
  const [size, setSize] = useState(1);
  const [insurance, setInsurance] = useState<Insurance | undefined>();
  const [emergency, setEmergency] = useState<boolean | undefined>();
  const [band, setBand] = useState<number | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const state = detail.data?.bill?.hospital.state ?? null;
  const check = useQuery(
    orpc.assistance.check.queryOptions({
      input: { caseId: id, householdSize: size },
    }),
  );
  const bands = check.data?.incomeBands ?? [];
  const stateRule = check.data?.checks?.find((c) => c.id.startsWith("state:"));

  // Saved info pre-fills the answers once.
  useEffect(() => {
    if (!info || prefilled) return;
    if (info.householdSize) setSize(info.householdSize);
    if (info.insurance) setInsurance(info.insurance);
    setPrefilled(true);
  }, [info, prefilled]);
  useEffect(() => {
    if (info?.incomeCents === undefined || bands.length === 0) return;
    const i = bandIndexFor(bands, info.incomeCents);
    if (i >= 0) setBand(i);
  }, [info?.incomeCents, bands]);

  const chosen = band === null ? undefined : bands[band];
  const usingSaved = Boolean(info?.householdSize);

  async function next() {
    if (!chosen) return;
    holdAnswers(id, {
      householdSize: size,
      annualIncomeCents: chosen.incomeCents,
      bandLabel: bandLabel(chosen),
      ...(insurance ? { insurance } : {}),
      ...(emergency === undefined ? {} : { emergency }),
    });
    await update({ householdSize: size, ...(insurance ? { insurance } : {}) });
    router.push({ pathname: "/case/[id]/assist-check", params: { id } });
  }

  return (
    <Screen
      footer={
        <>
          <Button
            label="Check what I qualify for"
            variant={chosen ? "primary" : "disabled"}
            onPress={next}
          />
          <Button label="Skip" variant="quiet" onPress={() => router.back()} />
        </>
      }
    >
      <T
        weight="semibold"
        className="pt-1 text-[28px] leading-[34px] tracking-tight"
      >
        A few quick questions
      </T>
      <T className="mt-1.5 text-[15px] text-muted leading-[22px]">
        They tell us which rules fit you.
        {stateRule && state && STATE_NAMES[state]
          ? ` ${STATE_NAMES[state]} hospitals must offer free or discounted care below certain incomes.`
          : ""}
      </T>
      {usingSaved ? (
        <T className="mt-2 text-[13px] text-muted">
          Using your saved info. You can change it in Account.
        </T>
      ) : null}

      <View className="mt-6 flex-row items-center justify-between">
        <View className="flex-1 gap-0.5">
          <T weight="semibold" className="text-[17px]">
            People in your household
          </T>
          <T className="text-[13px] text-muted">
            You, plus anyone you claim on taxes
          </T>
        </View>
        <View className="flex-row items-center gap-3.5">
          <Stepper
            icon="minus"
            label="Fewer people"
            onPress={() => {
              setSize((n) => Math.max(1, n - 1));
              setBand(null);
            }}
          />
          <T
            weight="semibold"
            accessibilityLiveRegion="polite"
            className="w-5 text-center text-xl"
          >
            {size}
          </T>
          <Stepper
            icon="plus"
            label="More people"
            onPress={() => {
              setSize((n) => Math.min(20, n + 1));
              setBand(null);
            }}
          />
        </View>
      </View>

      <Group title="Insurance for this visit">
        <View className="flex-row flex-wrap gap-2">
          {insuranceOptions(state).map((o) => (
            <Choice
              key={o.value}
              label={o.label}
              selected={insurance === o.value}
              onPress={() => setInsurance(o.value)}
              className="min-w-[47%] flex-1"
            />
          ))}
        </View>
      </Group>

      <Group title="Was this an emergency?">
        <View className="flex-row gap-2">
          <Choice
            label="Yes"
            selected={emergency === true}
            onPress={() => setEmergency(true)}
            className="flex-1"
          />
          <Choice
            label="No"
            selected={emergency === false}
            onPress={() => setEmergency(false)}
            className="flex-1"
          />
        </View>
      </Group>

      <Group title="Yearly income before taxes">
        {check.isError ? (
          <T className="text-coral-ink text-sm">{errorMessage(check.error)}</T>
        ) : (
          bands.map((b, i) => (
            <Choice
              key={b.incomeCents}
              label={bandLabel(b)}
              selected={band === i}
              onPress={() => setBand(i)}
            />
          ))
        )}
      </Group>

      <View className="mt-4 flex-row items-start gap-2">
        <Icon name="lock" size={16} color="#5B6B7C" />
        <T className="flex-1 text-[13px] text-muted leading-[18px]">
          Private. Your answers stay on this phone. We only send the range, and
          never save it.
        </T>
      </View>
    </Screen>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={title}
      className="mt-6 gap-2.5"
    >
      <T weight="semibold" className="text-[17px]">
        {title}
      </T>
      {children}
    </View>
  );
}

function Stepper({
  icon,
  label,
  onPress,
}: {
  icon: "minus" | "plus";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="size-11 items-center justify-center rounded-full border border-[#D5DAE1] bg-white"
    >
      <Icon name={icon} size={18} stroke={2} />
    </Pressable>
  );
}
