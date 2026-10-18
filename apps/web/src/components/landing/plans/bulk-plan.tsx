import { Money } from "@betterbill/ui/components/bb/money";
import { Button } from "@betterbill/ui/components/button";
import { Card } from "@betterbill/ui/components/card";
import { Input } from "@betterbill/ui/components/input";
import { Label } from "@betterbill/ui/components/label";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { orpc } from "@/utils/orpc";
import { Section, SectionTitle } from "../section";

// Demo pricing set on the Polar sandbox product (see docs/POLAR.md).
const BULK_PRICE_CENTS = 50_000;

export function BulkPlan() {
  const [promo, setPromo] = useState("");
  const checkout = useMutation(orpc.payment.bulkCheckout.mutationOptions());

  async function start() {
    const { url } = await checkout.mutateAsync({
      promoCode: promo.trim() || undefined,
    });
    window.location.assign(url);
  }

  return (
    <Section id="bulk-plan">
      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <SectionTitle>Bulk plan.</SectionTitle>
          <p className="mt-4 text-base leading-6">
            One monthly plan for insurers and plans. This is demo pricing in the
            Polar sandbox, so no real money moves.
          </p>
        </div>
        <Card className="mt-8 lg:col-span-7 lg:mt-0">
          <p className="text-base leading-6">
            <span className="font-semibold text-[28px] leading-[34px]">
              <Money cents={BULK_PRICE_CENTS} cents_display="hide" />
            </span>{" "}
            a month (demo pricing)
          </p>
          <Button
            className="w-full lg:w-auto"
            onClick={start}
            disabled={checkout.isPending}
          >
            Start the bulk plan
          </Button>
          <div className="space-y-2">
            <Label htmlFor="bulk-promo">Promo code (for development)</Label>
            <Input
              id="bulk-promo"
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              autoComplete="off"
              className="max-w-xs"
            />
          </div>
          {checkout.isError ? (
            <p role="alert" className="text-coral-ink text-sm leading-5">
              {checkout.error.message}
            </p>
          ) : null}
        </Card>
      </div>
    </Section>
  );
}
