import { Wordmark } from "@betterbill/ui/components/bb/wordmark";
import { Button } from "@betterbill/ui/components/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Camera, CircleAlert, Lock } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome, BetterBill" }] }),
  component: WelcomePage,
});

const CARDS = [
  {
    Icon: Camera,
    title: "Snap your bill",
    body: "Take a photo of each page, or paste the text from your patient portal.",
  },
  {
    Icon: CircleAlert,
    title: "See what looks wrong, with proof",
    body: "Every flag shows the line, the rule or price behind it, and where it came from.",
  },
  {
    Icon: BadgeCheck,
    title: "You approve everything we send",
    body: "We draft the letter or the call. Nothing goes out until you say yes.",
  },
];

function finish(navigate: ReturnType<typeof useNavigate>) {
  try {
    localStorage.setItem("bb_onboarded", "1");
  } catch {
    // Storage can be blocked. Continue without remembering.
  }
  void navigate({ to: "/check" });
}

function WelcomePage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const card = CARDS[index];
  const last = index === CARDS.length - 1;

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col px-5 py-4">
      <header className="flex h-14 items-center justify-between">
        <Wordmark />
        <Button variant="ghost" onClick={() => finish(navigate)}>
          Skip
        </Button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-mint-soft text-mint-ink">
          <card.Icon className="size-7" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h1 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em]">
          {card.title}
        </h1>
        <p className="text-muted-foreground">{card.body}</p>
        {last ? (
          <p className="flex items-center gap-2 text-muted-foreground text-sm leading-5">
            <Lock className="size-5" strokeWidth={1.75} aria-hidden="true" />
            We only use your bill to check it. We never sell your data.
          </p>
        ) : null}
        <div className="flex gap-2" aria-hidden="true">
          {CARDS.map((c, i) => (
            <span
              key={c.title}
              className={
                i === index
                  ? "h-2 w-6 rounded-full bg-primary"
                  : "size-2 rounded-full bg-border"
              }
            />
          ))}
        </div>
      </main>
      <footer className="pb-6">
        <Button
          className="w-full"
          onClick={() => (last ? finish(navigate) : setIndex(index + 1))}
        >
          {last ? "Check my bill" : "Next"}
        </Button>
      </footer>
    </div>
  );
}
