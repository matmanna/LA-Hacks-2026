// What each case status means to the patient: a title, one line of what
// happens next, and how far along the 4-step bar is (checked, approved,
// contacted, resolved).
export type StatusCopy = { title: string; next: string; step: number };

const READING: StatusCopy = {
  title: "Reading your bill",
  next: "We're reading the lines.",
  step: 0,
};

export const STATUS: Record<string, StatusCopy> = {
  new: READING,
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

export function statusOf(status: string | undefined): StatusCopy {
  return STATUS[status ?? ""] ?? READING;
}

// The same statuses for someone the patient shared the bill with.
export const SHARED_STATUS: Record<string, { title: string; next: string }> = {
  new: { title: "Reading the bill", next: "BetterBill is reading the lines." },
  lines_confirmed: {
    title: "Ready to check",
    next: "The patient confirmed the lines.",
  },
  audited: {
    title: "Checked",
    next: "BetterBill checked the bill. The patient reviews the plan next.",
  },
  action_pending: {
    title: "Waiting on the patient",
    next: "The patient is reviewing the letter before anything is sent.",
  },
  sent: {
    title: "Waiting on billing",
    next: "BetterBill emailed billing with the patient's approval.",
  },
  called: {
    title: "Waiting on billing",
    next: "BetterBill called and emailed billing with the patient's approval.",
  },
  closed: { title: "Closed", next: "This bill is done." },
};

export function sharedStatusOf(status: string | undefined) {
  return SHARED_STATUS[status ?? ""] ?? { title: READING.title, next: "" };
}
