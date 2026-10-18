import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { type ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { Button, Icon, Screen, T } from "@/components/bb";
import { errorMessage } from "@/lib/errors";
import { client, orpc } from "@/utils/orpc";

type Kind = "letter" | "itemized_request" | "call";

// L6 Plan + approve: the exact call script and email, one approval for both.
// With ?kind=itemized (from E3) there is no call, only the itemized request.
export default function Plan() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const itemized = kind === "itemized";
  const emailKind: Kind = itemized ? "itemized_request" : "letter";
  const [open, setOpen] = useState<"call" | "email" | null>(null);
  const [signed, setSigned] = useState(false);

  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const hospital = detail.data?.bill?.hospital.name ?? "the hospital";
  const call = useQuery({
    queryKey: ["draft", id, "call"],
    queryFn: () => client.action.draftLetter({ caseId: id, kind: "call" }),
    enabled: !itemized,
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
      const drafts = [email.data, itemized ? undefined : call.data];
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
      itemized
        ? router.replace({ pathname: "/case/[id]", params: { id } })
        : router.push({ pathname: "/case/[id]/join", params: { id } }),
  });

  const ready = Boolean(email.data) && (itemized || Boolean(call.data));
  const loading = email.isLoading || (!itemized && call.isLoading);
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
          <T className="pt-1 text-center text-muted text-xs leading-4">
            Approving covers{itemized ? "" : " the call script,"} the email, and
            your signed form. We save your approval with the time.
          </T>
          <Button
            label="Approve and start"
            variant={signed && ready ? "primary" : "disabled"}
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
        {itemized ? null : (
          <Step
            n={1}
            title="Your advocate calls billing"
            body="It waits on hold for you. When a person answers, we bring you on. Your advocate leads; you're there if they need you."
            toggle={
              open === "call" ? "Hide the call script" : "See what we'll say"
            }
            onToggle={() => setOpen((o) => (o === "call" ? null : "call"))}
          >
            {open === "call" && call.data ? (
              <Draft text={call.data.action.draft} />
            ) : null}
          </Step>
        )}
        <Step
          n={itemized ? 1 : 2}
          title={
            itemized ? "We ask for your itemized bill" : "We email the details"
          }
          body={
            itemized
              ? "You're CC'd, and they send the itemized bill to you."
              : "Each error with proof. You're CC'd, and they send your itemized bill to you."
          }
          toggle={open === "email" ? "Hide the email" : "See the email"}
          onToggle={() => setOpen((o) => (o === "email" ? null : "email"))}
        >
          {open === "email" && email.data ? (
            <Draft
              head={`To: ${email.data.action.recipient} · CC: you`}
              text={email.data.action.draft}
            />
          ) : null}
        </Step>
        <Step
          n={itemized ? 2 : 3}
          muted
          title="We text you updates"
          body={
            itemized
              ? "When it reaches your inbox."
              : "When the call ends, and when to follow up."
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
