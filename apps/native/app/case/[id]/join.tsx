import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Icon, T } from "@/components/bb";
import { useIsSample } from "@/lib/cases";
import { errorMessage } from "@/lib/errors";
import { DEMO_CALL_SCRIPT } from "@/lib/use-call-flow";
import { client, orpc } from "@/utils/orpc";

const READY = [
  { text: "Your bill and account number", have: true },
  { text: "Your signed authorization", have: true },
  { text: "Your date of birth and address", have: false },
  { text: "Insurance card, if you have one", have: false },
];

// A1 Can you join the call? A sheet over the plan.
export default function Join() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const sample = useIsSample(id);
  const scripted = DEMO_CALL_SCRIPT && sample;
  const [when, setWhen] = useState<"now" | "later">("now");
  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const call = detail.data?.actions.find((a) => a.kind === "call");

  const start = useMutation({
    mutationFn: async () => {
      if (!scripted && call) await client.call.start({ actionId: call.id });
    },
    onSuccess: () =>
      router.replace({
        pathname: "/case/[id]/call",
        params: scripted ? { id, script: "1" } : { id },
      }),
  });

  return (
    <View className="flex-1 justify-end bg-ink/45">
      <Pressable
        accessibilityLabel="Close"
        className="flex-1"
        onPress={() => router.back()}
      />
      <View
        className="gap-[18px] rounded-t-3xl bg-white px-5 pt-2.5"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <View className="h-[5px] w-10 self-center rounded-full bg-hairline" />
        <View className="gap-1.5">
          <T weight="semibold" className="text-[22px] leading-7">
            Can you join the call?
          </T>
          <T className="text-[15px] text-muted leading-[22px]">
            Your advocate waits on hold for you. When a billing rep answers, we
            call your phone so you can join. Hold times vary.
          </T>
        </View>

        <View accessibilityRole="radiogroup" className="gap-2.5">
          <Choice
            selected={when === "now"}
            onPress={() => setWhen("now")}
            title="Call now"
            note="I'm free and can pick up"
          />
          <Choice
            selected={when === "later"}
            onPress={() => setWhen("later")}
            title="Pick a time"
            note="During billing office hours"
          />
        </View>

        <View className="gap-2">
          <T weight="semibold" className="text-[13px] text-muted">
            Have these ready. Billing may ask.
          </T>
          <View className="flex-row flex-wrap gap-y-1.5">
            {READY.map((r) => (
              <View
                key={r.text}
                className="w-1/2 flex-row items-start gap-1.5 pr-3"
              >
                {r.have ? (
                  <Icon name="check" size={16} color="#0F9D76" stroke={2.5} />
                ) : (
                  <View className="mt-0.5 size-4 rounded-full border-2 border-[#5B6B7C]" />
                )}
                <T className="flex-1 text-sm leading-[19px]">{r.text}</T>
              </View>
            ))}
          </View>
        </View>

        {start.isError ? (
          <T className="text-coral-ink text-sm">{errorMessage(start.error)}</T>
        ) : null}

        <View className="gap-2">
          <Button
            label={when === "now" ? "Start the call" : "Choose a time"}
            variant={when === "now" ? "primary" : "disabled"}
            busy={start.isPending}
            onPress={() => start.mutate()}
          />
          <T className="text-center text-muted text-xs leading-4">
            {when === "now"
              ? "The email is already on its way. You're CC'd."
              : "Scheduling is coming soon. Call now, or come back later."}
          </T>
        </View>
      </View>
    </View>
  );
}

function Choice({
  selected,
  onPress,
  title,
  note,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  note: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 rounded-2xl p-3.5",
        selected
          ? "border-2 border-accent bg-secondary"
          : "border border-hairline",
      )}
    >
      <View
        className={cn(
          "size-5 rounded-full bg-white",
          selected ? "border-[6px] border-accent" : "border-2 border-[#C8D1DC]",
        )}
      />
      <View className="gap-0.5">
        <T weight="semibold" className="text-base">
          {title}
        </T>
        <T className="text-[13px] text-muted">{note}</T>
      </View>
    </Pressable>
  );
}
