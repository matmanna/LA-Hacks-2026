import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "../motion";

// Counts up to `to` once `run` is true. Reduced motion shows the end value.
export function useCountUp(to: number, run: boolean, ms = 900) {
  const reduced = usePrefersReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (reduced) {
      setV(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setV(to * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, run, ms, reduced]);
  return v;
}
