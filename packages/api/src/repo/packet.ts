// B2: builds the read-only evidence packet for a case.
import type { Flag, Packet, PacketSource } from "@betterbill/core";
import type { Database } from "@betterbill/db";

import { DATA } from "../data.gen";
import { auditResult } from "../routers/audit";
import { loadAssistance } from "../services/assistance";
import {
  getCaseRow,
  latestAudit,
  listActions,
  listEvents,
  loadBill,
  toSummary,
} from "./cases";

// Every source a flag cites, with the capture time and file hash we hold.
export function packetSources(flags: Flag[]): PacketSource[] {
  const out = new Map<string, PacketSource>();
  for (const f of flags) {
    const url = f.evidence.sourceUrl;
    if (!url || out.has(url)) continue;
    const mue = DATA.mue as {
      table: string;
      effectiveDate: string;
      sourcePage: string;
      sourceFile?: string;
      retrievedAt?: string;
      sha256?: string;
    } | null;
    if (mue && url === mue.sourcePage) {
      out.set(url, {
        label: `${mue.table}, effective ${mue.effectiveDate}`,
        url: mue.sourceFile ?? mue.sourcePage,
        capturedAt: mue.retrievedAt ?? null,
        sha256: mue.sha256 ?? null,
      });
      continue;
    }
    const capture = DATA.captures.find((c) =>
      c.sources.some((s) => s.url === url),
    );
    const src = capture?.sources.find((s) => s.url === url);
    out.set(url, {
      label: capture
        ? `${capture.hospitalName} published price file`
        : "Cited source",
      url,
      capturedAt: capture?.capturedAt ?? f.evidence.capturedAt ?? null,
      sha256: src?.sha256 ?? null,
    });
  }
  return [...out.values()];
}

// Masks an email or phone number so a shared packet never shows a real
// contact. Plain names ("Billing Office, ...") are kept.
export function maskRecipient(r: string): string {
  const at = r.indexOf("@");
  if (at > 0) return `${r[0]}***${r.slice(at)}`;
  const digits = r.replace(/\D/g, "");
  if (/^\+?[\d\s().-]{7,}$/.test(r.trim()) && digits.length >= 7)
    return `phone ending ${digits.slice(-2)}`;
  return r;
}

// A packet is read by anyone with the link, so it must not carry ids that
// unlock other procedures (case id, action ids) or drafts nobody approved.
export function redactPacket(p: Packet): Packet {
  const actions = p.actions
    .filter((a) => a.approvedAt !== null)
    .map((a) => ({ ...a, recipient: maskRecipient(a.recipient) }));
  // Screener and lookup records stay with the owner; the page doesn't need them.
  const events = p.events.map((e) =>
    /^(assistance|lookup)\./.test(e.type)
      ? (({ artifactRef: _ref, ...rest }) => rest)(e)
      : e,
  );
  let json = JSON.stringify({ ...p, actions, events });
  const swaps: [string, string][] = [
    [p.case.id, "shared"],
    ...p.actions.map((a, i): [string, string] => [a.id, `action-${i + 1}`]),
  ];
  for (const [from, to] of swaps) if (from) json = json.split(from).join(to);
  return JSON.parse(json) as Packet;
}

export async function buildPacket(
  db: Database,
  caseId: string,
): Promise<Packet | null> {
  const row = await getCaseRow(db, caseId);
  const loaded = row ? await loadBill(db, caseId) : null;
  if (!row || !loaded) return null;
  const run = await latestAudit(db, caseId);
  const audit = auditResult(
    caseId,
    loaded.bill,
    run?.flags ?? [],
    0,
    await loadAssistance(db, caseId, loaded.bill),
  );
  return redactPacket({
    case: toSummary(row, run ? audit.savings : null),
    bill: loaded.bill,
    flags: audit.flags,
    savings: audit.savings,
    balance: audit.balance,
    actions: await listActions(db, caseId),
    events: await listEvents(db, caseId),
    sources: packetSources(audit.flags),
    generatedAt: new Date().toISOString(),
  });
}
