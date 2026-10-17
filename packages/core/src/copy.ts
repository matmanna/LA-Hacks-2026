// Plain-language flag copy (grade 6 to 8, at most 2 sentences). Placeholder
// until C reviews. Asks, never accuses (shared context sections 7 and 8.6).
import { formatMoney } from "./money";

const times = (n: number) => (n === 2 ? "twice" : `${n} times`);
const count = (n: number) => (n === 2 ? "two" : String(n));

export const copy = {
  duplicate: {
    title: (n: number) =>
      n === 2
        ? "Listed twice on the same date"
        : `Listed ${n} times on the same date`,
    explanation: (n: number) =>
      `Listed ${times(n)} on the same date for the same amount. Ask billing whether you had ${count(n)} of these.`,
  },
  units: {
    title: () => "More units than the billing rule allows",
    explanation: (units: number, max: number) =>
      `You were billed for ${units} units on one day. The billing rule allows up to ${max} per day.`,
  },
  eobMismatch: {
    title: () => "Bill asks more than your EOB says",
    explanation: (dueCents: number, eobCents: number) =>
      `Your insurer's statement says you owe ${formatMoney(eobCents)}. This bill asks for ${formatMoney(dueCents)}.`,
  },
  publishedPrice: {
    title: () => "Higher than the hospital's published price",
    explanation: (chargeCents: number, cashCents: number) =>
      `This hospital publishes a cash price of ${formatMoney(cashCents)} for this service. You were billed ${formatMoney(chargeCents)}.`,
  },
  missingItemization: {
    title: () => "Ask for an itemized bill",
    explanation: () =>
      "This bill does not list each service with a code. Ask for an itemized bill so every charge can be checked.",
  },
} as const;
