import { formatPhone, normalizePhone } from "@betterbill/core";
import { Button } from "@betterbill/ui/components/button";
import { Input } from "@betterbill/ui/components/input";
import { Label } from "@betterbill/ui/components/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { AppBar } from "@/components/app-bar";
import { authClient } from "@/lib/auth-client";
import { claimDeviceCases, rememberDeviceCase } from "@/lib/device-cases";
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
  const [hospitalUrl, setHospitalUrl] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [filled, setFilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  // Fill once from what is saved: this case first, then the number from the
  // patient's earlier case.
  useEffect(() => {
    if (!data || filled) return;
    const phone =
      data.accountPhone ?? data.patientPhone ?? data.savedPatientPhone;
    setPatientPhone(phone ? formatPhone(phone) : "");
    setHospitalUrl(data.hospitalUrl ?? "");
    setBillingPhone(data.billingPhone ? formatPhone(data.billingPhone) : "");
    setFilled(true);
  }, [data, filled]);

  // A typed number on a signed-out device becomes a sign-in by texted code.
  const willSignIn = !data?.signedIn && patientPhone.trim() !== "";

  const toConfirm = () =>
    navigate({ to: "/case/$id/confirm", params: { id }, replace: true });

  // Signed out with a number: text a code first, so the bill follows the
  // patient to their other devices.
  async function sendCode() {
    const phone = normalizePhone(patientPhone);
    if (!phone) {
      setError(
        "Your phone number doesn't look right. Use a full number, like (415) 555-0123.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    const { error: sendError } = await authClient.phoneNumber.sendOtp({
      phoneNumber: phone,
    });
    setBusy(false);
    if (sendError) {
      setError(sendError.message ?? "We couldn't text that number.");
      return;
    }
    setCode("");
  }

  async function verify() {
    const phone = normalizePhone(patientPhone);
    if (!phone || !code) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await authClient.phoneNumber.verify({
      phoneNumber: phone,
      code,
    });
    if (verifyError) {
      setBusy(false);
      setError(verifyError.message ?? "That code didn't work. Try again.");
      return;
    }
    try {
      rememberDeviceCase(id);
      await claimDeviceCases(
        (caseId) => client.case.claim({ caseId }),
        localStorage,
      );
    } catch (syncError) {
      setBusy(false);
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Signed in, but your bill could not be synced.",
      );
      return;
    }
    await save();
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await client.contact.set({
        caseId: id,
        patientPhone,
        hospitalUrl,
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
            if (code !== null) void verify();
            else if (willSignIn) void sendCode();
            else void save();
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
              {data?.signedIn
                ? "You're signed in. Your bills sync to your other devices."
                : "Optional. We text a code to sign you in, so your bills follow you to the app and the web."}
            </p>
          </div>

          {code !== null ? (
            <div className="space-y-2">
              <Label htmlFor="sms-code">Code from the text</Label>
              <Input
                id="sms-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-muted-foreground text-sm leading-5">
                It can take a minute to arrive.
              </p>
            </div>
          ) : null}

          <section className="space-y-4 rounded-2xl border p-5">
            <h2 className="font-semibold text-lg leading-6">
              Hospital billing office
              {data?.hospitalName ? `, ${data.hospitalName}` : ""}
            </h2>
            <p className="text-muted-foreground text-sm leading-5">
              We look for the billing phone number on the hospital's website.
              Add either box below to use your own instead.
            </p>
            <div className="space-y-2">
              <Label htmlFor="hospital-url">Hospital website</Label>
              <Input
                id="hospital-url"
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="www.hospital.org"
                value={hospitalUrl}
                onChange={(e) => setHospitalUrl(e.target.value)}
              />
              <p className="text-muted-foreground text-sm leading-5">
                We start our search here.
              </p>
            </div>
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
            <Button
              type="submit"
              className="w-full"
              disabled={busy || (code !== null && code.length < 6)}
            >
              {code !== null
                ? "Verify and continue"
                : willSignIn
                  ? "Text me a code"
                  : "Continue"}
            </Button>
            {willSignIn || code !== null ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={busy}
                onClick={() => void save()}
              >
                Continue without signing in
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={busy}
                onClick={() => void toConfirm()}
              >
                Skip for now
              </Button>
            )}
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
