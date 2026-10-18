import { statusOf } from "@betterbill/core";

// The wording lives in core so the shared packet page says the same thing.
export { STATUS, statusOf } from "@betterbill/core";

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
