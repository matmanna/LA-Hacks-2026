import { LoadingState } from "@betterbill/ui/components/bb/states";
import { UploadPanel } from "@betterbill/ui/components/bb/upload-panel";
import { Button } from "@betterbill/ui/components/button";
import { Input } from "@betterbill/ui/components/input";
import { Label } from "@betterbill/ui/components/label";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { AppBar } from "@/components/app-bar";
import { useStartSample } from "@/hooks/use-start-sample";
import { authClient } from "@/lib/auth-client";
import { rememberDeviceCase } from "@/lib/device-cases";
import { fileToDataUrl } from "@/lib/downscale";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/check")({
  head: () => ({ meta: [{ title: "Check your bill, BetterBill" }] }),
  component: CheckPage,
});

const ONBOARDED_KEY = "bb_onboarded";

function CheckPage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const sample = useStartSample();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDED_KEY)) {
        void navigate({ to: "/welcome", replace: true });
      }
    } catch {
      // Storage can be blocked. Show the upload screen anyway.
    }
  }, [navigate]);

  async function run(read: (caseId: string) => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      const created = await client.case.create({});
      rememberDeviceCase(created.id);
      await read(created.id);
      await navigate({ to: "/case/$id/phone", params: { id: created.id } });
    } catch {
      setError(
        "We couldn't read this. Try a flatter, brighter photo, or paste the text instead.",
      );
      setBusy(false);
    }
  }

  const onPhotos = (files: File[]) =>
    run(async (caseId) => {
      const pages = await Promise.all(
        files.slice(0, 3).map(async (file, index) => ({
          imageDataUrl: await fileToDataUrl(file),
          page: index + 1,
        })),
      );
      await client.bill.parsePhoto({ caseId, pages });
    });

  const onText = (text: string) =>
    run((caseId) => client.bill.parseText({ caseId, text }));

  return (
    <>
      <AppBar title="Check a bill" back="/" />
      <main className="mx-auto max-w-6xl px-5 py-6 md:px-8 lg:grid lg:grid-cols-12 lg:gap-8 lg:py-12">
        <div className="space-y-4 lg:col-span-7 lg:col-start-2">
          <h1 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em] lg:text-[36px] lg:leading-[42px]">
            Check your bill
          </h1>
          <p className="text-muted-foreground">
            Itemized bills work best. If you only have a summary, we'll help you
            ask for the details.
          </p>
          {busy || sample.pending ? (
            <LoadingState />
          ) : (
            <UploadPanel
              onPhotos={onPhotos}
              onText={onText}
              onSample={sample.start}
              error={error ?? sample.error}
            />
          )}
        </div>
        <aside className="mt-8 lg:col-span-3 lg:mt-0">
          <SignInPanel signedIn={Boolean(session)} />
          <div className="mt-5 flex items-start gap-2 text-muted-foreground text-sm leading-5">
            <Lock
              className="mt-0.5 size-5 shrink-0"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <p>
              We only use your bill to check it. We never sell your data. No
              account needed to see results.
            </p>
          </div>
        </aside>
      </main>
    </>
  );
}

function SignInPanel({ signedIn }: { signedIn: boolean }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const result = sent
      ? await authClient.phoneNumber.verify({
          phoneNumber: phone.trim(),
          code: code.trim(),
        })
      : await authClient.phoneNumber.sendOtp({ phoneNumber: phone.trim() });
    if (result.error) {
      setError(result.error.message ?? "We couldn't verify that number.");
    } else if (!sent) {
      setSent(true);
    }
    setBusy(false);
  }

  return (
    <section className="rounded-3xl border bg-card p-5 shadow-sm">
      <p className="font-semibold text-lg">Already started a bill?</p>
      <p className="mt-1 text-muted-foreground text-sm leading-5">
        Sign in with your phone to see the same bills on the web and mobile.
      </p>
      {signedIn ? (
        <p className="mt-4 rounded-xl bg-mint-soft px-3 py-2 text-mint-ink text-sm">
          You’re signed in. New checks will be saved to your account.
        </p>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Label htmlFor="check-phone">Phone number</Label>
          <Input
            id="check-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+1 415 555 0123"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          {sent ? (
            <>
              <Label htmlFor="check-code">Code</Label>
              <Input
                id="check-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="676767"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
              />
              <p className="text-muted-foreground text-xs">
                Enter the code from your text. Demo mode accepts 676767.
              </p>
            </>
          ) : null}
          {error ? (
            <p role="alert" className="text-coral-ink text-sm">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={busy || !phone.trim() || (sent && !code.trim())}
          >
            {sent ? "Verify and sign in" : "Text me a code"}
          </Button>
        </form>
      )}
    </section>
  );
}
