import { ArrowRight } from "lucide-react";

// Put inside a primary Button. On hover the arrow springs in from the left and
// keeps a small nudge going. Reduced motion shows it without movement.
export function ArrowSlide() {
  return (
    <span aria-hidden="true" className="lp-arrow">
      <ArrowRight strokeWidth={2} />
    </span>
  );
}
