import type { Line } from "../schemas";

export const flagId = (lever: string, lineIds: string[]) =>
  `${lever}:${lineIds.join(",") || "bill"}`;

export const minConfidence = (lines: Line[]) =>
  lines.reduce((m, l) => Math.min(m, l.confidence), 1);

export const normalize = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, " ");
