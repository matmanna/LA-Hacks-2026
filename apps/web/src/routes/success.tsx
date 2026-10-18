import { Button } from "@betterbill/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleCheck } from "lucide-react";

export const Route = createFileRoute("/success")({
  head: () => ({
    meta: [
      { title: "Payment received, BetterBill" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuccessPage,
  validateSearch: (search: Record<string, unknown>) => ({
    checkout_id:
      typeof search.checkout_id === "string" ? search.checkout_id : undefined,
  }),
});

function SuccessPage() {
  const { checkout_id } = Route.useSearch();
  return (
    <main className="mx-auto flex max-w-sm flex-col items-center gap-3 px-5 py-16 text-center">
      <CircleCheck
        className="size-10 text-mint"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <h1 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em]">
        Thank you
      </h1>
      <p className="text-base leading-6">
        Your payment went through in the Polar sandbox. This is a demo, so no
        real money moved.
      </p>
      {checkout_id ? (
        <p className="text-muted-foreground text-xs leading-4">
          Reference: {checkout_id}
        </p>
      ) : null}
      <Button nativeButton={false} render={<Link to="/" />}>
        Back to BetterBill
      </Button>
      <p className="text-muted-foreground text-xs leading-4">
        BetterBill is informational, not legal or medical advice.
      </p>
    </main>
  );
}
