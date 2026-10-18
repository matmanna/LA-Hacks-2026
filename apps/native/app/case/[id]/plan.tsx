import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { type ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { Button, Icon, Screen, T } from "@/components/bb";
import { useIsSample } from "@/lib/cases";
import { errorMessage } from "@/lib/errors";
import { DEMO_CALL_SCRIPT } from "@/lib/use-call-flow";
import { client, orpc } from "@/utils/orpc";

type Kind = "letter" | "itemized_request" | "call";

// L6 Plan + approve: the exact call script and email, one approval for both.
// With ?kind=itemized (from E3) the email asks for the itemized bill, and the
// call follows it up when calls are set up (the call is optional there).
export default function Plan() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const itemized = kind === "itemized";
  const emailKind: Kind = itemized ? "itemized_request" : "letter";
  const [open, setOpen] = useState<"call" | "email" | null>(null);
  const [signed, setSigned] = useState(false);
  const [paidPlanAgreement, setPaidPlanAgreement] = useState(false);
  const sample = useIsSample(id);
  const scripted = DEMO_CALL_SCRIPT && sample;

  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const hospital = detail.data?.bill?.hospital.name ?? "the hospital";
  const call = useQuery({
    queryKey: ["draft", id, "call"],
    queryFn: () => client.action.draftLetter({ caseId: id, kind: "call" }),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const email = useQuery({
    queryKey: ["draft", id, emailKind],
    queryFn: () => client.action.draftLetter({ caseId: id, kind: emailKind }),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const approve = useMutation({
    mutationFn: async () => {
      // The draft hashes prove the user approved this exact text.
      const drafts = [email.data, call.data];
      for (const d of drafts) {
        if (!d) continue;
        await client.action.approve({
          actionId: d.action.id,
          draftHash: d.draftHash,
          consent: true,
        });
      }
      if (email.data)
        await client.action.send({ actionId: email.data.action.id });
    },
    onSuccess: () =>
      call.data
        ? router.push({ pathname: "/case/[id]/join", params: { id } })
        : router.replace({ pathname: "/case/[id]", params: { id } }),
  });

  // Itemized requests go out by email even when a call can't be drafted.
  const withCall = !itemized || Boolean(call.data);
  const ready =
    Boolean(email.data) && (itemized ? !call.isLoading : Boolean(call.data));
  const loading = email.isLoading || call.isLoading;
  const failed = email.error ?? (itemized ? null : call.error);

  return (
    <Screen
      nav="close"
      footer={
        <>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: signed }}
            onPress={() => setSigned((s) => !s)}
            className="flex-row items-center gap-3 rounded-[14px] border border-hairline px-3.5 py-3"
          >
            <View
              className={cn(
                "size-[22px] items-center justify-center rounded-md",
                signed ? "bg-ink" : "border-[#C8D1DC] border-[1.5px]",
              )}
            >
              {signed ? (
                <Icon name="check" size={14} color="#FFFFFF" stroke={2.5} />
              ) : null}
            </View>
            <View className="flex-1 gap-0.5">
              <T className="text-sm leading-[19px]">
                I authorize BetterBill to contact {hospital} about this bill for
                me.
              </T>
              <T className="text-muted text-xs">
                {signed ? "Signed today" : "Tap to sign"}
              </T>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: paidPlanAgreement }}
            onPress={() => setPaidPlanAgreement((s) => !s)}
            className="flex-row items-start gap-3 rounded-[14px] border border-hairline px-3.5 py-3"
          >
            <View
              className={cn(
                "size-[22px] items-center justify-center rounded-md",
                paidPlanAgreement
                  ? "bg-ink"
                  : "border-[#C8D1DC] border-[1.5px]",
              )}
            >
              {paidPlanAgreement ? (
                <Icon name="check" size={14} color="#FFFFFF" stroke={2.5} />
              ) : null}
            </View>
            <T className="flex-1 text-sm leading-[19px]">
              I agree to BetterBill’s paid plan: 10% of confirmed savings,
              capped at $1,000. Estimates never count, and there is no fee when
              nothing is confirmed.
            </T>
          </Pressable>
          <T className="pt-1 text-center text-muted text-xs leading-4">
            Approving covers{withCall ? " the call script," : ""} the email, and
            your signed form. We save your approval with the time.
          </T>
          <Button
            label="Approve and start"
            variant={
              signed && paidPlanAgreement && ready ? "primary" : "disabled"
            }
            busy={approve.isPending}
            onPress={() => approve.mutate()}
          />
          <Button
            label="Not now"
            variant="quiet"
            onPress={() => router.back()}
          />
        </>
      }
    >
      <T
        weight="semibold"
        className="pt-1 text-[28px] leading-[34px] tracking-tight"
      >
        Here's the plan
      </T>
      <T className="mt-1.5 text-base text-muted leading-6">
        Check the words, then approve once.
      </T>

      {loading ? <ActivityIndicator className="pt-6" color="#1E4ED8" /> : null}
      {failed ? (
        <T className="pt-4 text-coral-ink text-sm">{errorMessage(failed)}</T>
      ) : null}

      <View className="gap-5 pt-5">
        {withCall ? (
          <Step
            n={1}
            title="Your advocate calls billing"
            body={
              !scripted
                ? `It says it's automated, asks ${itemized ? "for your itemized bill" : "billing to review each item"}, and never agrees to pay.`
                : itemized
                  ? "To make sure they send your itemized bill. When a person answers, we bring you on."
                  : "It waits on hold for you. When a person answers, we bring you on. Your advocate leads; you're there if they need you."
            }
            toggle={
              open === "call" ? "Hide the call script" : "See what we'll say"
            }
            onToggle={() => setOpen((o) => (o === "call" ? null : "call"))}
          >
            {open === "call" && call.data ? (
              <Draft text={call.data.action.draft} />
            ) : null}
          </Step>
        ) : null}
        <Step
          n={withCall ? 2 : 1}
          title={
            itemized ? "We ask for your itemized bill" : "We email the details"
          }
          body={
            itemized
              ? "We ask them to send the itemized bill to you."
              : "Each error with proof, sent to the billing office."
          }
          toggle={open === "email" ? "Hide the email" : "See the email"}
          onToggle={() => setOpen((o) => (o === "email" ? null : "email"))}
        >
          {open === "email" && email.data ? (
            <Draft
              head={`To: ${email.data.action.recipient}`}
              text={email.data.action.draft}
            />
          ) : null}
        </Step>
        <Step
          n={withCall ? 3 : 2}
          muted
          title="Follow along here"
          body={
            itemized
              ? "Add the itemized bill when it reaches your inbox."
              : "See what billing said when the call ends."
          }
        />
      </View>
    </Screen>
  );
}

function Step({
  n,
  title,
  body,
  toggle,
  onToggle,
  muted = false,
  children,
}: {
  n: number;
  title: string;
  body: string;
  toggle?: string;
  onToggle?: () => void;
  muted?: boolean;
  children?: ReactNode;
}) {
  return (
    <View className="flex-row items-start gap-3.5">
      <View
        className={cn(
          "size-9 items-center justify-center rounded-full",
          muted ? "bg-wash" : "bg-ink",
        )}
      >
        <T
          weight="semibold"
          className={cn("text-sm", muted ? "" : "text-white")}
        >
          {n}
        </T>
      </View>
      <View className="flex-1 gap-1 pt-1.5">
        <T weight="semibold" className="text-[17px]">
          {title}
        </T>
        <T className="text-[15px] text-muted leading-[22px]">{body}</T>
        {toggle ? (
          <Pressable
            accessibilityRole="button"
            onPress={onToggle}
            className="h-9 justify-center self-start"
          >
            <T weight="semibold" className="text-accent text-sm">
              {toggle}
            </T>
          </Pressable>
        ) : null}
        {children}
      </View>
    </View>
  );
}

function Draft({ head, text }: { head?: string; text: string }) {
  return (
    <View className="gap-2 rounded-[14px] bg-wash p-3.5">
      {head ? <T className="text-[13px] text-muted">{head}</T> : null}
      <T className="text-[13px] leading-5">{text}</T>
    </View>
  );
}
