import { cn } from "@betterbill/ui/lib/utils";
import type { ReactNode } from "react";

import { useSeenOnce } from "./motion";

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, seen] = useSeenOnce<HTMLDivElement>(0.12);
  return (
    <div
      ref={ref}
      data-in={seen}
      className={cn("lp-reveal", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
