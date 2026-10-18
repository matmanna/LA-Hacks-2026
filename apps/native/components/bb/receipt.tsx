import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";

import { orpc } from "@/utils/orpc";

import { Icon } from "./icon";
import { T } from "./t";

const time = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

// The agent's work on this bill, from the case's event log. Each row is a
// real event; the newest of each kind wins.
const ROWS: Record<string, (summary: string, lines: number) => string> = {
  "audit.completed": (_s, lines) =>
    `Checked all ${lines} line${lines === 1 ? "" : "s"} of your bill`,
  "assistance.checked": (s) => s,
  "lookup.completed": (s) => s,
  "action.drafted": () => "Drafted your letter, word for word",
  "action.sent": () => "Emailed billing, with your approval",
  "call.completed": () => "Called billing, with your approval",
};

// L5 V3 "What we did for you". policyRead names the captured policy the
// checks read, when there is one.
export function Receipt({
  id,
  lines,
  policyRead,
}: {
  id: string;
  lines: number;
  policyRead?: string | null;
}) {
  const events = useQuery(
    orpc.event.list.queryOptions({ input: { caseId: id } }),
  );
  const latest = new Map<string, { at: string; summary: string }>();
  for (const e of events.data ?? []) {
    if (ROWS[e.type]) latest.set(e.type, { at: e.at, summary: e.summary });
  }
  const rows = [...latest.entries()]
    .map(([type, e]) => ({
      at: e.at,
      text: (ROWS[type] as (s: string, l: number) => string)(e.summary, lines),
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
  const checked = latest.get("assistance.checked");
  if (policyRead && checked) {
    const i = rows.findIndex((r) => r.at === checked.at);
    rows.splice(i < 0 ? rows.length : i, 0, {
      at: checked.at,
      text: `Read ${policyRead}`,
    });
  }
  if (rows.length === 0) return null;

  return (
    <View className="mt-5 rounded-2xl bg-wash px-4 pt-2.5 pb-1.5">
      <T weight="semibold" className="pb-1 text-[13px] text-muted">
        What we did for you
      </T>
      {rows.map((r) => (
        <View key={r.text} className="flex-row items-start gap-2.5 py-2">
          <View className="mt-0.5 size-[18px] items-center justify-center rounded-full bg-mint">
            <Icon name="check" size={10} color="#FFFFFF" stroke={4} />
          </View>
          <T className="flex-1 text-sm leading-5">{r.text}</T>
          <T className="pt-px text-muted text-xs">
            {time.format(new Date(r.at))}
          </T>
        </View>
      ))}
    </View>
  );
}
