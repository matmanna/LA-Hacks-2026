import { cn } from "@betterbill/ui/lib/utils";
import type { CSSProperties } from "react";

type EdgeProps = { axis?: "x" | "y"; delay?: number; className?: string };

// Hairline with a short beam gliding along it. `delay` staggers beams so
// consecutive edges read as one flow.
export function Edge({ axis = "x", delay = 0, className }: EdgeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "lp-edge block",
        axis === "y" ? "lp-edge-y w-[2px]" : "h-[2px]",
        className,
      )}
      style={{ "--bd": `${delay}s` } as CSSProperties}
    >
      <i />
    </span>
  );
}

// Edge with a port at each end, for joining two nodes.
export function PortedEdge({ axis = "x", delay = 0, className }: EdgeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex items-center",
        axis === "y" ? "flex-col" : "flex-row",
        className,
      )}
    >
      <span className="lp-port relative z-10 shrink-0" />
      <Edge
        axis={axis}
        delay={delay}
        className={axis === "y" ? "-my-0.5 flex-1" : "-mx-0.5 flex-1"}
      />
      <span className="lp-port relative z-10 shrink-0" />
    </span>
  );
}
