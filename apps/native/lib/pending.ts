import type { Page } from "./photos";

// Photos picked on the scan screen wait here until the reading screen sends
// them. Base64 pages are too large for route params.
const pending = new Map<string, Page[]>();

export function holdPages(caseId: string, pages: Page[]) {
  pending.set(caseId, pages);
}

export function takePages(caseId: string): Page[] | null {
  const pages = pending.get(caseId) ?? null;
  pending.delete(caseId);
  return pages;
}

export function peekPages(caseId: string): Page[] | null {
  return pending.get(caseId) ?? null;
}
