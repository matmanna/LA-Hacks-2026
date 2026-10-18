// Display formatting only. Savings always come from the server's audit.
const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function money(cents: number) {
  const text = dollars.format(Math.abs(cents) / 100);
  return cents < 0 ? `−${text}` : text;
}

const time = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function when(iso: string) {
  return time.format(new Date(iso));
}

export const STATUS_LABEL: Record<string, string> = {
  new: "Waiting for your bill",
  lines_confirmed: "Lines confirmed",
  audited: "Checked",
  action_pending: "Letter waiting for approval",
  sent: "Letter sent",
  called: "Call placed",
  closed: "Closed",
};
