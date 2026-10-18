// What each case status means to the patient: a title, one line of what
// happens next, and how far along the 4-step bar is (checked, approved,
// contacted, resolved).
export const STATUS: Record<
  string,
  { title: string; next: string; step: number }
> = {
  new: {
    title: "Reading your bill",
    next: "We're reading the lines.",
    step: 0,
  },
  lines_confirmed: {
    title: "Ready to check",
    next: "Your lines are confirmed. Run the check.",
    step: 0,
  },
  audited: {
    title: "Checked",
    next: "See what we found and approve the plan.",
    step: 1,
  },
  action_pending: {
    title: "Waiting for you",
    next: "Check the words, then approve once.",
    step: 1,
  },
  sent: {
    title: "Waiting on billing",
    next: "We emailed billing. Nothing for you to do.",
    step: 2,
  },
  called: {
    title: "Waiting on billing",
    next: "Called and emailed. Nothing for you to do.",
    step: 3,
  },
  closed: { title: "Closed", next: "This bill is done.", step: 4 },
};

export function statusOf(status: string | undefined) {
  return STATUS[status ?? ""] ?? STATUS.new;
}

type CaseLike = {
  case: { status: string };
  bill: { kind: string } | null;
  actions: { kind: string; sentAt: string | null }[];
};

// A summary bill whose itemized request went out: we are waiting for the
// itemized bill to arrive (W3 V2).
export function itemizedPending(d: CaseLike | undefined) {
  return Boolean(
    d &&
      d.bill?.kind === "summary" &&
      d.actions.some((a) => a.kind === "itemized_request" && a.sentAt),
  );
}

export function caseStatus(d: CaseLike | undefined) {
  if (itemizedPending(d)) {
    return {
      title: "Itemized bill on its way",
      next: "Billing said they'd send it. It may come by email or mail.",
      step: 2,
    };
  }
  return statusOf(d?.case.status);
}
