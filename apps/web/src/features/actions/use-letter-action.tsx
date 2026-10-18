import { ApprovalSheet } from "@betterbill/ui/components/bb/approval-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { client } from "@/utils/orpc";

type Draft = Awaited<ReturnType<typeof client.action.draftLetter>>;

const DATA_SHARED = [
  "Hospital name",
  "Account number, last 4 digits only",
  "The bill lines named in the letter",
];

function errorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Something went wrong. Please try again.";
}

// Drafts the letter, shows its exact text in the ApprovalSheet, and records
// the approval. Closing the sheet without approving cancels the draft, so a
// letter nobody approved can never be sent later.
export function useLetterAction(caseId: string) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries();

  async function start() {
    setBusy(true);
    const toastId = toast.loading(
      "Writing your letter. This takes a few seconds.",
    );
    try {
      const res = await client.action.draftLetter({ caseId, kind: "letter" });
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

  // The approval stays valid after a failed send, so "Try again" just resends.
  async function send(actionId: string) {
    try {
      await client.action.send({ actionId });
      toast.success("Sent to the test inbox.");
    } catch (error) {
      toast.error(errorMessage(error), {
        action: { label: "Try again", onClick: () => void send(actionId) },
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
      await client.action.approve({ actionId, draftHash: draft.draftHash });
    } catch (error) {
      toast.error(errorMessage(error));
      setBusy(false);
      void refresh();
      return;
    }
    setDraft(null);
    setOpen(false);
    await send(actionId);
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
      kind="letter"
      recipient={draft.action.recipient}
      channelDetail="Email. This demo sends only to the team's test inbox."
      text={draft.action.draft}
      dataShared={DATA_SHARED}
      pending={busy}
      onApprove={approve}
    />
  ) : null;

  return { start, busy, sheet };
}
