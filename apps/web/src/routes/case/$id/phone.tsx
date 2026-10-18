import { formatPhone } from "@betterbill/core";
import { Button } from "@betterbill/ui/components/button";
import { Input } from "@betterbill/ui/components/input";
import { Label } from "@betterbill/ui/components/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { AppBar } from "@/components/app-bar";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/case/$id/phone")({
  head: () => ({
    meta: [
      { title: "Your phone number, BetterBill" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PhonePage,
});

function PhonePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery(
    orpc.contact.get.queryOptions({ input: { caseId: id } }),
  );
  const [patientPhone, setPatientPhone] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [filled, setFilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fill once from what is saved: this case first, then the number from the
  // patient's earlier case.
  useEffect(() => {
    if (!data || filled) return;
    const phone = data.patientPhone ?? data.savedPatientPhone;
    setPatientPhone(phone ? formatPhone(phone) : "");
    setBillingPhone(data.billingPhone ? formatPhone(data.billingPhone) : "");
    setFilled(true);
  }, [data, filled]);

  const toConfirm = () =>
    navigate({ to: "/case/$id/confirm", params: { id }, replace: true });

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await client.contact.set({
        caseId: id,
        patientPhone,
        billingPhone,
      });
      await queryClient.invalidateQueries();
      // Look for the billing phone on the hospital's site in the background.
      // It reports "unavailable" without a key, which is fine.
      void client.hospital.lookup({ caseId: id }).catch(() => undefined);
      await toConfirm();
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Something went wrong. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      <AppBar title="Call details" />
      <main className="mx-auto max-w-2xl space-y-6 px-5 pt-4 pb-10 md:px-8">
        <div className="space-y-2">
          <h1 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em] lg:text-[36px] lg:leading-[42px]">
            Your phone number
          </h1>
          <p className="text-muted-foreground">
            If you ask us to call billing, we ring you first and you stay on the
            line. You approve every call before it starts.
          </p>
        </div>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="patient-phone">Your phone</Label>
            <Input
              id="patient-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(415) 555-0123"
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
            />
            <p className="text-muted-foreground text-sm leading-5">
              Optional. Leave blank to join from your browser.
            </p>
          </div>

          <section className="space-y-4 rounded-2xl border p-5">
            <h2 className="font-semibold text-lg leading-6">
              Demo Billing Department Override
            </h2>
            <p className="text-muted-foreground text-sm leading-5">
              Browser Use researches the hospital named on your itemized bill
              and finds its official billing contact. Enter a number only to
              override that demo lookup.
            </p>
            <div className="space-y-2">
              <Label htmlFor="billing-phone">Billing phone</Label>
              <Input
                id="billing-phone"
                type="tel"
                inputMode="tel"
                placeholder="(415) 555-0199"
                value={billingPhone}
                onChange={(e) => setBillingPhone(e.target.value)}
              />
              <p className="text-muted-foreground text-sm leading-5">
                Use this number instead of the one we find.
              </p>
            </div>
          </section>

          {error ? (
            <p role="alert" className="text-coral-ink text-sm leading-5">
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <Button type="submit" className="w-full" disabled={busy}>
              Continue
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={busy}
              onClick={() => void toConfirm()}
            >
              Skip for now
            </Button>
          </div>
        </form>

        <p className="flex items-start gap-2 text-muted-foreground text-sm leading-5">
          <Lock
            className="mt-0.5 size-5 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          We only use these numbers to place calls you approve. We never sell
          your data.
        </p>
      </main>
    </>
  );
}
