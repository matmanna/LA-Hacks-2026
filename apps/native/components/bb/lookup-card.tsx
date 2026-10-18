import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { cancelLookupReminder, remindWhenLookupReady } from "@/lib/notify";
import { client, orpc, queryClient } from "@/utils/orpc";

import { Button } from "./button";
import { Icon } from "./icon";
import { T } from "./t";

const ago = (iso: string | null) => {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  return min < 1 ? "Started just now" : `Started ${min} min ago`;
};

// W3 V2/V3: the background lookup of the hospital's assistance policy.
// Polls every 5 s while it runs. Shows nothing when the policy is on file.
export function LookupCard({
  id,
  offer = false,
}: {
  id: string;
  // Show "Look it up" when no lookup has started and the policy isn't on file.
  offer?: boolean;
}) {
  const status = useQuery({
    ...orpc.hospital.lookupStatus.queryOptions({ input: { caseId: id } }),
    refetchInterval: (q) => (q.state.data?.state === "running" ? 5000 : false),
  });
  const start = useMutation({
    mutationFn: () => client.hospital.lookup({ caseId: id }),
    onSuccess: (s) => {
      if (s.state === "running" && s.hospitalName) {
        void remindWhenLookupReady(id, s.hospitalName);
      }
      void queryClient.invalidateQueries();
    },
  });

  const s = status.data;
  const wasRunning = useRef(false);
  useEffect(() => {
    if (s?.state === "running") wasRunning.current = true;
    if (wasRunning.current && (s?.state === "done" || s?.state === "failed")) {
      wasRunning.current = false;
      void cancelLookupReminder(id);
      void queryClient.invalidateQueries();
    }
  }, [s?.state, id]);

  if (!s || s.state === "on_file" || s.state === "unavailable") return null;
  const name = s.hospitalName ?? "The hospital";

  if (s.state === "none") {
    if (!offer) return null;
    return (
      <View className="mt-4 gap-3 rounded-[20px] bg-white px-[18px] py-4">
        <Header
          icon="globe"
          title={`We don't have ${name}'s policy yet`}
          note="Your advocate can find it on their website. It usually takes about 2 minutes."
        />
        <Button
          label="Look it up"
          variant="secondary"
          busy={start.isPending}
          onPress={() => start.mutate()}
        />
      </View>
    );
  }

  if (s.state === "done" || s.state === "failed") {
    const p = s.policy;
    const limits = p
      ? [
          p.freeCareMaxFplPct
            ? `Free care up to ${p.freeCareMaxFplPct}% of the poverty line`
            : null,
          p.discountMaxFplPct
            ? `discounts up to ${p.discountMaxFplPct}%`
            : null,
        ]
          .filter(Boolean)
          .join(", ")
      : null;
    return (
      <View className="mt-4 gap-3 rounded-[20px] bg-white px-[18px] py-4">
        <Header
          icon={p ? "check" : "minus"}
          tone={p ? "mint" : "slate"}
          title={
            p
              ? `Found ${name}'s assistance policy`
              : `Couldn't find ${name}'s income limits online`
          }
          note={
            p
              ? `${limits}.`
              : "You can still ask billing for their financial assistance application."
          }
        />
        {p ? (
          <View className="flex-row flex-wrap items-center gap-1">
            <T className="text-muted text-xs">Read by your advocate ·</T>
            <Pressable
              accessibilityRole="link"
              hitSlop={12}
              onPress={() => void WebBrowser.openBrowserAsync(p.policyUrl)}
            >
              <T weight="semibold" className="text-accent text-xs">
                View source
              </T>
            </Pressable>
          </View>
        ) : null}
        {p ? (
          <Button
            label="Check if you qualify"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: "/case/[id]/assist", params: { id } })
            }
          />
        ) : null}
      </View>
    );
  }

  // Running.
  const steps = s.steps;
  return (
    <View className="mt-4 gap-2 rounded-[20px] bg-white px-[18px] py-4">
      <Header
        icon="globe"
        title={`Looking up ${name}'s assistance policy`}
        note="Your advocate is reading their website. Usually takes about 2 minutes. You can leave this screen."
      />
      <View accessibilityRole="list" className="pt-1">
        {steps.map((step) => (
          <View
            key={step.at + step.text}
            className="flex-row items-start gap-3 py-1.5"
          >
            <View className="mt-0.5 size-5 items-center justify-center rounded-full bg-mint">
              <Icon name="check" size={11} color="#FFFFFF" stroke={3.5} />
            </View>
            <T className="flex-1 text-sm leading-5">{step.text}</T>
          </View>
        ))}
        <View className="flex-row items-start gap-3 py-1.5">
          <View className="mt-0.5 size-5 items-center justify-center">
            <ActivityIndicator size="small" color="#1E4ED8" />
          </View>
          <T weight="semibold" className="flex-1 text-sm leading-5">
            {steps.length === 0 ? "Starting a browser…" : "Working…"}
          </T>
        </View>
      </View>
      <View className="flex-row items-center justify-between border-hairline border-t pt-2.5">
        <T className="text-[13px] text-muted">{ago(s.startedAt)}</T>
        {s.liveViewUrl ? (
          <Pressable
            accessibilityRole="link"
            hitSlop={12}
            onPress={() =>
              s.liveViewUrl && void WebBrowser.openBrowserAsync(s.liveViewUrl)
            }
          >
            <T weight="semibold" className="text-[13px] text-accent">
              Watch the agent
            </T>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Header({
  icon,
  title,
  note,
  tone = "blue",
}: {
  icon: "globe" | "check" | "minus";
  title: string;
  note: string;
  tone?: "blue" | "mint" | "slate";
}) {
  const bg = {
    blue: "bg-secondary",
    mint: "bg-mint-soft",
    slate: "bg-slate-soft",
  }[tone];
  const color = { blue: "#1E3A8A", mint: "#065F46", slate: "#334155" }[tone];
  return (
    <View className="flex-row items-start gap-3">
      <View className={`size-9 items-center justify-center rounded-full ${bg}`}>
        <Icon
          name={icon}
          size={18}
          color={color}
          stroke={icon === "globe" ? 1.75 : 2.25}
        />
      </View>
      <View className="flex-1 gap-0.5">
        <T weight="semibold" className="text-base">
          {title}
        </T>
        <T className="text-[13px] text-muted leading-[18px]">{note}</T>
      </View>
    </View>
  );
}
