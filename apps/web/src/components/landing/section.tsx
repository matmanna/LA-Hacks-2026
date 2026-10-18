import { cn } from "@betterbill/ui/lib/utils";
import type { ReactNode } from "react";

export function Section({
  id,
  band,
  className,
  children,
}: {
  id?: string;
  band?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "px-5 py-16 md:px-8 lg:py-28",
        band && "bg-muted",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-serif text-[32px] leading-[36px] lg:text-[44px] lg:leading-[48px]">
      {children}
    </h2>
  );
}
