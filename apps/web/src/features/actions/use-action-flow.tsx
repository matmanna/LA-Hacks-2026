import { ApprovalSheet } from "@betterbill/ui/components/bb/approval-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { client } from "@/utils/orpc";

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

  const refresh = () => queryClient.invalidateQueries();

  async function start() {
    setBusy(true);
    setConsent(false);
    const toastId = toast.loading(flow.drafting);
    try {
      const res = await client.action.draftLetter({ caseId, kind });
      toast.dismiss(toastId);
      setDraft(res);
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
  async function go(actionId: string) {
    try {
      await flow.go(actionId);
      toast.success(flow.done);
      if (kind === "call") {
        await navigate({ to: "/case/$id/activity", params: { id: caseId } });
      }
    } catch (error) {
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
    setBusy(true);
    try {
      await client.action.approve({
        actionId,
        draftHash: draft.draftHash,
        consent: kind === "call" ? consent : undefined,
      });
    } catch (error) {
      toast.error(errorMessage(error));
      setBusy(false);
      void refresh();
      return;
    }
    setDraft(null);
    setOpen(false);
    await go(actionId);
    setBusy(false);
  }

  async function onOpenChange(next: boolean) {
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

  const sheet = draft ? (
    <ApprovalSheet
      open={open}
      onOpenChange={onOpenChange}
      kind={kind}
      recipient={flow.recipient(draft.action.recipient)}
      channelDetail={flow.channelDetail}
      text={draft.action.draft}
      dataShared={[...flow.dataShared]}
      pending={busy}
      onApprove={approve}
      consent={
        kind === "call"
          ? { checked: consent, onCheckedChange: setConsent }
          : undefined
      }
    />
  ) : null;

  return { start, busy, sheet };
}
