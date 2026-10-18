import { Wordmark } from "@betterbill/ui/components/bb/wordmark";

type SiteFooterProps = { audience?: "patients" | "plans" };

export function SiteFooter({ audience = "patients" }: SiteFooterProps) {
  const links =
    audience === "patients"
      ? [
          ["How it works", "/#how"],
          ["Pricing", "/#pricing"],
          ["For plans", "/for-plans"],
          ["FAQ", "/#faq"],
        ]
      : [
          ["For patients", "/"],
          ["Approach", "/for-plans#approach"],
          ["Security", "/for-plans#security"],
        ];
  return (
    <footer className="border-t px-5 py-10 text-sm md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Wordmark suffix={audience === "plans" ? "for plans" : undefined} />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              ...links,
              ["GitHub", "https://github.com/vs-githjk/LA-Hacks-2026"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="py-2 text-muted-foreground hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="space-y-1 text-muted-foreground text-xs leading-4">
          <p>BetterBill is informational, not legal or medical advice.</p>
          <p>Demo data is synthetic.</p>
          <p>Made at LA Hacks 2026.</p>
        </div>
      </div>
    </footer>
  );
}
