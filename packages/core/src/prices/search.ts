import { type PriceService, SERVICES } from "./services";

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

// Finds services by plain words ("mri back", "blood test", "ct head") or by
// code. Every typed word must start a word of the service's name, chip label,
// search terms or code. A code match ranks first, then a whole-term match.
export function searchServices(
  query: string,
  services: readonly PriceService[] = SERVICES,
): PriceService[] {
  // "CPT 72148" means the code.
  const typed = words(query).filter((w) => w !== "cpt");
  if (typed.length === 0) return [...services];
  const phrase = typed.join(" ");
  const scored = services.flatMap((s) => {
    const vocab = [s.name, s.short, s.code, ...s.terms].flatMap(words);
    const hit = typed.every((t) => vocab.some((w) => w.startsWith(t)));
    if (!hit) return [];
    const score =
      s.code === phrase
        ? 0
        : [s.short, ...s.terms].some((t) => words(t).join(" ") === phrase)
          ? 1
          : 2;
    return [{ s, score }];
  });
  return scored.sort((a, b) => a.score - b.score).map((x) => x.s);
}
