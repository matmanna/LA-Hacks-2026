import { Money } from "@betterbill/ui/components/bb/money";
import { TierBadge } from "@betterbill/ui/components/bb/tier-badge";
import { Button } from "@betterbill/ui/components/button";
import { Card, CardTitle } from "@betterbill/ui/components/card";
import { Input } from "@betterbill/ui/components/input";
import { Label } from "@betterbill/ui/components/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { orpc } from "@/utils/orpc";

// Secondary, optional card. Every number comes from payment.quote (core
// savingsFee on the stored audit); this component only renders it.
export function PayCard({ caseId }: { caseId: string }) {
  const [promo, setPromo] = useState("");
  const promoId = useId();
  const quote = useQuery({
    ...orpc.payment.quote.queryOptions({ input: { caseId } }),
    retry: false,
  });
  const checkout = useMutation(orpc.payment.checkout.mutationOptions());

  // Hide quietly if the quote is unavailable (for example, an account is needed).
  if (!quote.data) return null;
  const q = quote.data;

  async function pay() {
    const { url } = await checkout.mutateAsync({
      caseId,
      promoCode: promo.trim() || undefined,
    });
    window.location.assign(url);
  }

  return (
    <Card>
      <CardTitle>Pay BetterBill {q.percentLabel} of what you save</CardTitle>
      <p className="text-muted-foreground text-sm leading-5">
        Optional. The check is free. This fee is only on savings confirmed from
        your bill.
      </p>
      <TierBadge tier="confirmed" className="self-start" />
      <dl className="space-y-2 text-sm leading-5">
        <div className="flex items-baseline justify-between gap-3">
          <dt>Confirmed savings</dt>
          <dd className="font-semibold text-mint-ink">
            <Money cents={q.confirmedCents} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt>Your fee</dt>
          <dd className="font-semibold">
            <Money cents={q.feeCents} />
          </dd>
        </div>
      </dl>
      <p className="text-muted-foreground text-xs leading-4">
        {q.owed
          ? q.note
          : "Nothing is owed because no savings are confirmed yet."}{" "}
        Possible savings are an estimate and are never charged on.
      </p>
      {q.owed && q.paymentsEnabled ? (
        <>
          <Button
            variant="secondary"
            className="w-full"
            onClick={pay}
            disabled={checkout.isPending}
          >
            Pay with Polar
          </Button>
          <details className="text-xs leading-4">
            <summary className="cursor-pointer text-muted-foreground">
              Development code
            </summary>
            <Label htmlFor={promoId} className="mt-2">
              Development code (sandbox only)
            </Label>
            <Input
              id={promoId}
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              autoComplete="off"
            />
          </details>
          {checkout.isError ? (
            <p role="alert" className="text-coral-ink text-sm leading-5">
              {checkout.error.message}
            </p>
          ) : null}
        </>
      ) : q.owed ? (
        <p className="text-muted-foreground text-sm leading-5">
          Payments are not turned on in this demo.
        </p>
      ) : null}
    </Card>
  );
}
