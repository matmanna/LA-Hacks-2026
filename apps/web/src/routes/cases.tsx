import { Money } from "@betterbill/ui/components/bb/money";
import { Button } from "@betterbill/ui/components/button";
import { Input } from "@betterbill/ui/components/input";
import { Label } from "@betterbill/ui/components/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { AppBar } from "@/components/app-bar";
import { authClient } from "@/lib/auth-client";
import { claimDeviceCases } from "@/lib/device-cases";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "Your bills, BetterBill" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CasesPage,
});

// Every bill saved to the signed-in account, the same list the phone app shows.
function CasesPage() {
  const { data: session, isPending } = authClient.useSession();
  const cases = useQuery({
    ...orpc.case.list.queryOptions({ input: {} }),
    enabled: Boolean(session),
  });

  return (
    <>
      <AppBar title="Your bills" back="/" />
      <main className="mx-auto max-w-2xl space-y-4 px-5 py-6 md:px-8">
        {isPending ? null : !session ? (
          <SignInByText />
        ) : (
          <>
            <p className="text-muted-foreground">
              Signed in as {session.user.name}. These bills also show in the
              phone app.
            </p>
            {cases.data?.length === 0 ? (
              <p>No bills yet.</p>
            ) : (
              <ul className="space-y-2">
                {cases.data?.map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/case/$id"
                      params={{ id: c.id }}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {c.hospitalName ?? "Bill"}
                        </span>
                        <span className="block text-muted-foreground text-sm">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {c.savings ? (
                          <Money cents={c.savings.confirmedCents} />
                        ) : null}
                        <ChevronRight
                          className="size-5"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="ghost" onClick={() => void authClient.signOut()}>
              Sign out
            </Button>
          </>
        )}
      </main>
    </>
  );
}

function SignInByText() {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    if (code === null) {
      const { error: e } = await authClient.phoneNumber.sendOtp({
        phoneNumber: phone.trim(),
      });
      if (e) setError(e.message ?? "We couldn't text that number.");
      else setCode("");
    } else {
      const { error: e } = await authClient.phoneNumber.verify({
        phoneNumber: phone.trim(),
        code,
      });
      if (e) setError(e.message ?? "That code didn't work. Try again.");
      else {
        try {
          await claimDeviceCases(
            (caseId) => client.case.claim({ caseId }),
            localStorage,
          );
          await queryClient.invalidateQueries();
        } catch (syncError) {
          setError(
            syncError instanceof Error
              ? syncError.message
              : "Signed in, but your bills could not be synced.",
          );
        }
      }
    }
    setBusy(false);
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h1 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em]">
        Sign in to see your bills
      </h1>
      <p className="text-muted-foreground">
        We text you a code. Use the same number in the phone app to see the same
        bills.
      </p>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+1 415 555 0123"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {code !== null ? (
        <div className="space-y-2">
          <Label htmlFor="code">Code from the text</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-coral-ink text-sm leading-5">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={busy || !phone.trim()}>
        {code === null ? "Text me a code" : "Verify and sign in"}
      </Button>
    </form>
  );
}
