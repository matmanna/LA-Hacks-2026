import { cn } from "@betterbill/ui/lib/utils";
import { Link } from "@tanstack/react-router";

export type Audience = "patients" | "plans";

const TABS: { audience: Audience; to: "/" | "/for-plans"; label: string }[] = [
  { audience: "patients", to: "/", label: "For patients" },
  { audience: "plans", to: "/for-plans", label: "For plans" },
];

// Cobalt strip above the whole page. It picks the audience, and each audience
// gets its own nav and landing page.
export function AudienceBar({ audience }: { audience: Audience }) {
  return (
    <div className="bg-primary text-primary-foreground">
      <nav
        aria-label="Audience"
        className="mx-auto flex h-10 max-w-6xl items-center justify-between px-5 md:px-8"
      >
        <div className="-ml-3 flex h-full items-stretch gap-1">
          {TABS.map((tab) => {
            const active = tab.audience === audience;
            return (
              <Link
                key={tab.audience}
                to={tab.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center px-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                  active ? "text-white" : "text-white/70 hover:text-white",
                )}
              >
                {tab.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-white transition-opacity duration-200",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            );
          })}
        </div>
        <p className="hidden text-white/80 text-xs sm:block">
          {audience === "patients"
            ? "Check a bill you got. Free."
            : "Review bills for your members."}
        </p>
      </nav>
    </div>
  );
}
