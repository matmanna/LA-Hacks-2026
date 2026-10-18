// Matching rules for evaluation (plan C section 4.2).

export type FlagLike = { lever: string; lineIds: string[] };

export type FlagMatch<E, P> = {
  caught: { expected: E; produced: P }[];
  missed: E[];
  extra: P[];
};

// An expected flag is caught by a produced flag with the same lever that shares at least one lineId.
// Each produced flag matches at most one expected flag. Expected flags are matched in order.
export function matchFlags<E extends FlagLike, P extends FlagLike>(
  expected: E[],
  produced: P[],
): FlagMatch<E, P> {
  const used = new Set<number>();
  const caught: FlagMatch<E, P>["caught"] = [];
  const missed: E[] = [];
  for (const e of expected) {
    const ids = new Set(e.lineIds);
    const i = produced.findIndex(
      (p, j) =>
        !used.has(j) &&
        p.lever === e.lever &&
        p.lineIds.some((id) => ids.has(id)),
    );
    if (i < 0) {
      missed.push(e);
      continue;
    }
    used.add(i);
    caught.push({ expected: e, produced: produced[i] as P });
  }
  const extra = produced.filter((_, j) => !used.has(j));
  return { caught, missed, extra };
}

export type LineLike = {
  id?: string;
  code: string | null;
  serviceDate: string | null;
  units: number;
  chargeCents: number;
};

export function lineScore(t: LineLike, x: LineLike): number {
  return (
    (t.code !== null && t.code === x.code ? 2 : 0) +
    (t.chargeCents === x.chargeCents ? 2 : 0) +
    (t.serviceDate !== null && t.serviceDate === x.serviceDate ? 1 : 0) +
    (t.units === x.units ? 1 : 0)
  );
}

// M1 greedy matching: best-scoring pairs first; a pair counts if score >= 4 and chargeCents are equal.
export function matchLines<T extends LineLike, X extends LineLike>(
  truth: T[],
  extracted: X[],
): { pairs: { truth: T; extracted: X; score: number }[] } {
  const candidates: { ti: number; xi: number; score: number }[] = [];
  truth.forEach((t, ti) => {
    extracted.forEach((x, xi) => {
      const score = lineScore(t, x);
      if (score >= 4 && t.chargeCents === x.chargeCents)
        candidates.push({ ti, xi, score });
    });
  });
  candidates.sort((a, b) => b.score - a.score || a.ti - b.ti || a.xi - b.xi);
  const usedT = new Set<number>();
  const usedX = new Set<number>();
  const pairs: { truth: T; extracted: X; score: number }[] = [];
  for (const c of candidates) {
    if (usedT.has(c.ti) || usedX.has(c.xi)) continue;
    usedT.add(c.ti);
    usedX.add(c.xi);
    pairs.push({
      truth: truth[c.ti] as T,
      extracted: extracted[c.xi] as X,
      score: c.score,
    });
  }
  return { pairs };
}
