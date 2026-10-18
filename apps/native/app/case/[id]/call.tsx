import { agreedText } from "@betterbill/core";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { cn } from "heroui-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Icon, type IconName, Row, Screen, T } from "@/components/bb";
import { type CallStage, useCallFlow } from "@/lib/use-call-flow";

const COPY: Record<string, { title: string; sub: string }> = {
  on_hold: {
    title: "Your advocate is calling",
    sub: "It gets through the phone menu and waits on hold. We'll ring you when a person answers.",
  },
  joined: { title: "On the call", sub: "" },
  done: {
    title: "Call done",
    sub: "Sending the email with the details.",
  },
  waiting: {
    title: "Waiting on billing",
    sub: "They'll send your itemized bill to your email.",
  },
  failed: {
    title: "The call didn't go through",
    sub: "Nothing was said and nothing changed on your bill. You can try again.",
  },
};

// Live calls have no phone menu, no hold, and no join prompt. A direct call
// dials billing alone; a conference call rings the patient first.
const DIALING = {
  title: "Calling billing",
  sub: "Our assistant says it's automated and sticks to the script you approved.",
};
const CONFERENCE_DIALING = {
  title: "Calling you first",
  sub: "We ring the test patient phone and explain the call, then dial billing. Stay on the line.",
};

// L7 call tracking, with A2 Incoming call and A3 Missed. ?script=1 replays
// the sample call (see DEMO_CALL_SCRIPT); otherwise it follows call.status.
export default function Call() {
  const { id, script } = useLocalSearchParams<{
    id: string;
    script?: string;
  }>();
  const scripted = script === "1";
  const flow = useCallFlow(id, scripted);
  const { stage } = flow;
  const bill = flow.detail?.bill;
  const hospital = bill?.hospital.name.split(" ")[0] ?? "Billing";
  const flags = flow.detail?.audit?.flags.length ?? 0;
  const email = flow.detail?.actions.find((a) => a.kind !== "call");

  if (stage === "incoming") {
    return (
      <Incoming
        hospital={hospital}
        onJoin={flow.join}
        onDecline={flow.decline}
      />
    );
  }
  if (stage === "missed") {
    return <Missed id={id} onRetry={flow.retry} />;
  }

  const { conference } = flow;
  const copy =
    !scripted && stage === "on_hold"
      ? conference
        ? CONFERENCE_DIALING
        : DIALING
      : (COPY[stage] ?? COPY.on_hold);
  const eyebrow = {
    on_hold: scripted ? "on hold" : conference ? "connecting" : "dialing",
    // ponytail: ai_unavailable also reads as in_progress, so a conference
    // whose advocate dropped still says 3. Split the status if that matters.
    joined: scripted || conference ? "3 on the call" : "on the call",
    done: `account ending ${bill?.accountRefMasked ?? ""}`,
    waiting: `account ending ${bill?.accountRefMasked ?? ""}`,
    failed: "call ended",
  }[stage as string];

  return (
    <Screen
      onNav={() => router.replace("/")}
      aside={
        scripted
          ? "Sample call"
          : flow.outcome?.source === "recorded_fallback"
            ? "Recorded test call"
            : undefined
      }
      footer={
        stage === "joined" && scripted ? (
          <View className="flex-row gap-2.5">
            <Button
              label="Mute"
              variant="outline"
              className="h-12 flex-1 border-0 bg-wash"
            />
            <Pressable
              accessibilityRole="button"
              onPress={flow.decline}
              className="h-12 flex-1 items-center justify-center rounded-xl bg-coral-soft"
            >
              <T weight="semibold" className="text-[15px] text-coral-ink">
                Leave call
              </T>
            </Pressable>
          </View>
        ) : stage === "on_hold" && scripted ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/")}
            className="h-11 items-center justify-center"
          >
            <T weight="medium" className="text-[15px] text-coral-ink">
              Stop the call
            </T>
          </Pressable>
        ) : stage === "failed" ? (
          <Button
            label="Try again"
            onPress={() =>
              router.replace({ pathname: "/case/[id]/join", params: { id } })
            }
          />
        ) : stage === "waiting" ? (
          <Button label="Done" onPress={() => router.replace("/")} />
        ) : null
      }
    >
      <View className="gap-1.5 pt-2">
        <T className="text-muted text-sm">
          {hospital} · {eyebrow}
        </T>
        <T
          weight="semibold"
          className="text-[28px] leading-[34px] tracking-tight"
        >
          {copy.title}
        </T>
        <T className="text-base text-muted leading-6">
          {stage !== "joined"
            ? copy.sub
            : conference
              ? "You and billing are talking. Your advocate is listening."
              : "Your advocate is asking for a hold, your itemized bill, and how to get your records."}
        </T>
      </View>

      <Track stage={stage} />

      {stage === "on_hold" && scripted ? (
        <View className="flex-row items-center gap-3.5 rounded-2xl bg-wash p-4">
          <Bars />
          <View className="gap-0.5">
            <T weight="semibold" className="text-base">
              Your advocate is holding
            </T>
            <T className="text-[13px] text-muted">
              Phone menu done. Waiting for a person.
            </T>
          </View>
        </View>
      ) : null}

      {conference && stage === "joined" ? (
        <View className="rounded-[14px] border border-hairline px-3.5 py-3">
          <T className="text-[13px] text-slate-ink leading-[19px]">
            Answer billing's questions yourself. Need help? Say "Advocate, can
            you help?" It answers once, then listens again. Hanging up ends the
            call.
          </T>
        </View>
      ) : null}

      {/* The live transcript only arrives after the call ends. */}
      {stage === "joined" && scripted ? (
        <View className="gap-3">
          <View className="flex-row gap-2">
            <Person icon="landmark" label="Billing rep" />
            <Person dark label="Your advocate" />
            <Person you label="On the line" />
          </View>
          <View className="gap-2">
            {[
              "Billing rep: I'll need to verify the patient before we continue.",
              "Your advocate: The patient is on the line with us and can confirm.",
            ].map((line) => (
              <T key={line} className="text-sm leading-5">
                {line}
              </T>
            ))}
          </View>
          <View className="rounded-[14px] border border-hairline px-3.5 py-3">
            <T className="text-[13px] text-slate-ink leading-[19px]">
              If they ask for you, give your date of birth. If they push back on
              the advocate, say "This is my advocate. I'd like them to
              continue."
            </T>
          </View>
        </View>
      ) : null}

      {stage === "done" || stage === "waiting" ? (
        <View>
          {scripted || flow.outcome ? (
            <Row
              label="They said"
              value={
                scripted
                  ? `Will review all ${flags}`
                  : (flow.outcome?.billingResponse ??
                    flow.outcome?.summary ??
                    "")
              }
            />
          ) : null}
          {flow.outcome?.referenceNumber ? (
            <Row label="Reference" value={flow.outcome.referenceNumber} />
          ) : null}
          {(
            [
              [
                "Account hold",
                agreedText(flow.outcome?.holdAgreed, "Billing agreed"),
              ],
              [
                "Itemized bill",
                agreedText(
                  flow.outcome?.itemizedPromised,
                  "Billing will send it",
                ),
              ],
              ["Your records", flow.outcome?.recordsProcess ?? undefined],
            ] as [string, string | undefined][]
          ).map(([label, value]) =>
            value ? <Row key={label} label={label} value={value} /> : null,
          )}
          {scripted ? (
            <Row label="Itemized bill" value="Sent to your email" />
          ) : null}
          <Row
            label="Email to billing"
            value={email?.sentAt || stage === "waiting" ? "Sent" : "Sending…"}
            last
          />
        </View>
      ) : null}
    </Screen>
  );
}

const NODES: IconName[] = ["phone", "mail", "clock", "check"];
const ACTIVE: Record<string, number> = {
  on_hold: 0,
  joined: 0,
  done: 1,
  waiting: 2,
  failed: 0,
};

function Track({ stage }: { stage: CallStage }) {
  const active = ACTIVE[stage] ?? 0;
  return (
    <View className="flex-row items-center py-5">
      {NODES.map((icon, i) => (
        <View
          key={icon}
          className={cn("flex-row items-center", i > 0 && "flex-1")}
        >
          {i > 0 ? (
            <View
              className={cn(
                "h-[3px] flex-1",
                i <= active ? "bg-ink" : "bg-hairline",
              )}
            />
          ) : null}
          <View
            className={cn(
              "size-11 items-center justify-center rounded-full",
              i < active ? "bg-ink" : i === active ? "bg-accent" : "bg-wash",
            )}
            style={
              i === active
                ? { boxShadow: "0 0 0 6px rgba(30,78,216,0.15)" }
                : undefined
            }
          >
            <Icon name={icon} color={i <= active ? "#FFFFFF" : "#5B6B7C"} />
          </View>
        </View>
      ))}
    </View>
  );
}

function Bars({ small = false }: { small?: boolean }) {
  const bars = small
    ? [
        ["a", 10],
        ["b", 16],
        ["c", 9],
      ]
    : [
        ["a", 14],
        ["b", 20],
        ["c", 12],
      ];
  return (
    <View
      className={cn(
        "flex-row items-center justify-center gap-[3px] rounded-full bg-ink",
        small ? "size-9 bg-ink-soft" : "size-11",
      )}
    >
      {bars.map(([key, height]) => (
        <View
          key={key}
          className="w-[3px] rounded-full bg-mint"
          style={{ height: Number(height) }}
        />
      ))}
    </View>
  );
}

function Person({
  label,
  icon,
  dark = false,
  you = false,
}: {
  label: string;
  icon?: IconName;
  dark?: boolean;
  you?: boolean;
}) {
  return (
    <View
      className={cn(
        "flex-1 items-center gap-1.5 rounded-[14px] px-1.5 py-3",
        dark ? "bg-ink" : "bg-wash",
      )}
    >
      {dark ? (
        <Bars small />
      ) : you ? (
        <View className="size-9 items-center justify-center rounded-full bg-mint-soft">
          <T weight="semibold" className="text-[13px] text-mint-ink">
            You
          </T>
        </View>
      ) : (
        <View className="size-9 items-center justify-center rounded-full bg-white">
          <Icon name={icon ?? "phone"} size={18} />
        </View>
      )}
      <T className={cn("text-xs", dark && "text-white")}>{label}</T>
    </View>
  );
}

// A2 Incoming call: billing is on the line and the patient can join.
function Incoming({
  hospital,
  onJoin,
  onDecline,
}: {
  hospital: string;
  onJoin: () => void;
  onDecline: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 items-center gap-10 bg-ink"
      style={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 48 }}
    >
      <StatusBar style="light" />
      <View className="items-center gap-2.5 px-7">
        <T className="text-[15px] text-ink-muted">Incoming call · sample</T>
        <T
          weight="serif"
          className="text-center text-[40px] text-white leading-[44px]"
        >
          BetterBill Advocate
        </T>
        <T className="text-center text-[#D5DCE4] text-base leading-[23px]">
          A {hospital} billing rep is on the line. Answer to join.
        </T>
      </View>
      <View className="size-[168px] items-center justify-center">
        <View className="absolute size-[168px] rounded-full border-2 border-mint/35" />
        <View className="absolute size-[124px] rounded-full border-2 border-mint/60" />
        <View className="size-[104px] items-center justify-center rounded-full bg-ink-soft">
          <T
            weight="serif"
            className="text-[52px] text-mint-soft leading-[64px]"
          >
            B
          </T>
        </View>
      </View>
      <T className="px-14 text-center text-ink-muted text-sm leading-5">
        Your advocate leads the call. Stay on in case they need you.
      </T>
      <View className="flex-1" />
      <View className="w-full flex-row justify-between px-[50px]">
        <CallButton
          label="Not now"
          color="bg-coral"
          onPress={onDecline}
          rotate
        />
        <CallButton label="Join" color="bg-mint" onPress={onJoin} />
      </View>
    </View>
  );
}

function CallButton({
  label,
  color,
  onPress,
  rotate = false,
}: {
  label: string;
  color: string;
  onPress: () => void;
  rotate?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center gap-2.5"
    >
      <View
        className={cn(
          "size-[72px] items-center justify-center rounded-full",
          color,
        )}
      >
        <View
          style={rotate ? { transform: [{ rotate: "135deg" }] } : undefined}
        >
          <Icon name="hangup" size={30} color="#FFFFFF" stroke={2} />
        </View>
      </View>
      <T
        weight={rotate ? "regular" : "semibold"}
        className={cn("text-sm", rotate ? "text-ink-muted" : "text-white")}
      >
        {label}
      </T>
    </Pressable>
  );
}

// A3 Missed: a rep answered but the patient could not join.
function Missed({ id, onRetry }: { id: string; onRetry: () => void }) {
  return (
    <Screen
      nav="close"
      onNav={() => router.replace("/")}
      aside="Sample call"
      footer={
        <>
          <Button
            label="Pick a new time"
            onPress={() =>
              router.replace({ pathname: "/case/[id]/join", params: { id } })
            }
          />
          <Button
            label="I'm free now, call again"
            variant="quiet"
            onPress={onRetry}
          />
        </>
      }
    >
      <View className="mt-8 size-16 items-center justify-center rounded-full bg-amber-soft">
        <Icon name="phone" size={28} color="#92400E" />
      </View>
      <View className="gap-1.5 pt-5">
        <T
          weight="semibold"
          className="text-[28px] leading-[34px] tracking-tight"
        >
          We missed you this time
        </T>
        <T className="text-base text-muted leading-6">
          A billing rep picked up, but you couldn't join. Your advocate thanked
          them and ended the call. Nothing changed on your bill.
        </T>
      </View>
      <View className="pt-[22px]">
        <Row label="Email to billing" value="Sent" />
        <Row label="Call" value="Not done yet" last />
      </View>
    </Screen>
  );
}
