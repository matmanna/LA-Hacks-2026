import {
  isPatientFirstConferenceScript,
  type PatientConnection,
  patientConnectionForScript,
} from "@betterbill/core";
import { ApprovalSheet } from "@betterbill/ui/components/bb/approval-sheet";
import { ResponsiveOverlay } from "@betterbill/ui/components/bb/responsive-overlay";
import { Button } from "@betterbill/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { client } from "@/utils/orpc";
import { useBrowserCall } from "./use-browser-call";

type Kind = "letter" | "call";
type Draft = Awaited<ReturnType<typeof client.action.draftLetter>>;

const FLOW = {
  letter: {
    drafting: "Writing your letter. This takes a few seconds.",
    channelDetail: "Email. This demo sends only to the team's test inbox.",
    dataShared: [
      "Hospital name",
      "Account number, last 4 digits only",
      "The bill lines named in the letter",
    ],
    recipient: (to: string) => to,
    go: (actionId: string) => client.action.send({ actionId }),
    done: "Sent to the test inbox.",
  },
  call: {
    drafting: "Getting the call script ready.",
    channelDetail: "Phone call from BetterBill's automated assistant.",
    dataShared: [
      "Hospital name",
      "Account number, last 4 digits only",
      "Up to 3 items and their amounts",
      "Related service dates, billing codes, units, and billed charges",
      "Evidence, published prices, and their sources",
    ],
    recipient: (to: string) =>
      `Billing office test phone, ending ${to.slice(-4)}`,
    go: (actionId: string) => client.call.start({ actionId }),
    done: "Calling now. Follow along in Activity.",
  },
} as const;

function errorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Something went wrong. Please try again.";
}

// Drafts a letter or call script, shows its exact text in the ApprovalSheet,
// records the approval, then sends or calls. Closing the sheet without
// approving cancels the draft, so nothing unapproved can go out later.
export function useActionFlow(caseId: string, kind: Kind) {
  const flow = FLOW[kind];
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [paidPlanAgreement, setPaidPlanAgreement] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const browser = useBrowserCall();

  const refresh = () => queryClient.invalidateQueries();

  async function start() {
    if (kind === "call") {
      setChoosing(true);
      return;
    }
    await draftAction();
  }

  async function draftAction(patientConnection?: PatientConnection) {
    setBusy(true);
    setConsent(false);
    setPaidPlanAgreement(false);
    const toastId = toast.loading(flow.drafting);
    try {
      const res = await client.action.draftLetter({
        caseId,
        kind,
        patientConnection,
      });
      toast.dismiss(toastId);
      setDraft(res);
      setChoosing(false);
      setOpen(true);
    } catch (error) {
      toast.error(errorMessage(error), { id: toastId });
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  // The approval stays valid after a failed send or call, so "Try again"
  // simply retries.
  async function go(actionId: string, browserPatient = false) {
    try {
      const result = await flow.go(actionId);
      const callStatus = "status" in result ? result.status : undefined;
      if (browserPatient) {
        if (!("browserSession" in result) || !result.browserSession)
          throw new Error(
            "This browser call has already started or ended. Review a new call to join.",
          );
        await browser.connect(result.browserSession);
        return;
      }
      if (kind === "call" && callStatus === "failed") {
        throw new Error(
          "This call has ended. Review a new call before trying again.",
        );
      }
      toast.success(
        kind === "call" && callStatus === "done"
          ? "This call has already finished. Its result is in Activity."
          : flow.done,
      );
      if (kind === "call") {
        await navigate({ to: "/case/$id/activity", params: { id: caseId } });
      }
    } catch (error) {
      if (browserPatient) {
        browser.disconnect();
        toast.error(errorMessage(error));
        return;
      }
      toast.error(errorMessage(error), {
        action: { label: "Try again", onClick: () => void go(actionId) },
      });
    } finally {
      void refresh();
    }
  }

  async function approve() {
    if (!draft) return;
    const actionId = draft.action.id;
    const browserPatient =
      kind === "call" &&
      patientConnectionForScript(draft.action.draft) === "browser";
    setBusy(true);
    try {
      if (browserPatient) await browser.prepare();
      await client.action.approve({
        actionId,
        draftHash: draft.draftHash,
        consent: kind === "call" ? consent : undefined,
      });
    } catch (error) {
      browser.disconnect();
      toast.error(errorMessage(error));
      setBusy(false);
      void refresh();
      return;
    }
    setDraft(null);
    setOpen(false);
    await go(actionId, browserPatient);
    setBusy(false);
  }

  async function onOpenChange(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (next || !draft) return;
    const cancelled = draft;
    setDraft(null);
    try {
      await client.action.approve({
        actionId: cancelled.action.id,
        draftHash: cancelled.draftHash,
        cancel: true,
      });
      toast("Cancelled. Nothing was sent.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      void refresh();
    }
  }

  const patientFirst =
    kind === "call" &&
    draft !== null &&
    isPatientFirstConferenceScript(draft.action.draft);
  const patientLast4 = draft?.action.draft
    .match(/patient test participant at (\+\d+)\b/)?.[1]
    ?.slice(-4);
  const sheet = draft ? (
    <ApprovalSheet
      open={open}
      onOpenChange={onOpenChange}
      kind={kind}
      recipient={
        patientFirst &&
        patientConnectionForScript(draft.action.draft) === "browser"
          ? `You in your browser, then the billing test phone ending ${draft.action.recipient.slice(-4)}`
          : patientFirst
            ? `Your phone${patientLast4 ? ` ending ${patientLast4}` : ""} first, then the billing test phone ending ${draft.action.recipient.slice(-4)}`
            : flow.recipient(draft.action.recipient)
      }
      channelDetail={
        patientFirst &&
        patientConnectionForScript(draft.action.draft) === "browser"
          ? "Allow your microphone and hear a short introduction in this browser. We'll then connect billing automatically. Stay on the call and speak directly when your approval is needed."
          : patientFirst
            ? "Answer your phone and hear a short introduction. We'll then connect billing automatically. Stay on the call and speak directly when your approval is needed."
            : flow.channelDetail
      }
      patientFirst={patientFirst}
      browserPatient={
        patientConnectionForScript(draft.action.draft) === "browser"
      }
      text={draft.action.draft}
      dataShared={[
        ...flow.dataShared,
        ...(kind === "call" &&
        draft.action.draft.includes("Fictional role-play patient:")
          ? ["Fictional demo patient name and date of birth"]
          : []),
      ]}
      pending={busy}
      onApprove={approve}
      consent={
        kind === "call"
          ? { checked: consent, onCheckedChange: setConsent }
          : undefined
      }
      paidPlanAgreement={{
        checked: paidPlanAgreement,
        onCheckedChange: setPaidPlanAgreement,
      }}
    />
  ) : null;

  return {
    start,
    busy: busy || browser.active,
    sheet: (
      <>
        {sheet}
        <ResponsiveOverlay
          open={choosing}
          onOpenChange={(open) => {
            if (!busy) setChoosing(open);
          }}
          title="How would you like to join?"
          description="Choose how you will speak with the advocate and billing representative."
        >
          <p className="text-sm leading-6">
            You'll hear a short introduction first. Then the advocate calls
            billing, with you present to answer and approve directly.
          </p>
          <Button disabled={busy} onClick={() => void draftAction("browser")}>
            Join in this browser
          </Button>
          <p className="text-muted-foreground text-sm">
            Use your microphone and speakers. Keep this tab open during the
            call.
          </p>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void draftAction("phone")}
          >
            Call my phone
          </Button>
          <p className="text-muted-foreground text-sm">
            Receive a call on the phone number you entered, or the demo patient
            phone if you skipped it.
          </p>
        </ResponsiveOverlay>
        {browser.panel}
      </>
    ),
  };
}
