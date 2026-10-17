import { LoadingState } from "@betterbill/ui/components/bb/states";
import { UploadPanel } from "@betterbill/ui/components/bb/upload-panel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { AppBar } from "@/components/app-bar";
import { useStartSample } from "@/hooks/use-start-sample";
import { fileToDataUrl } from "@/lib/downscale";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/check")({
  head: () => ({ meta: [{ title: "Check your bill, BetterBill" }] }),
  component: CheckPage,
});

const ONBOARDED_KEY = "bb_onboarded";

function CheckPage() {
  const navigate = useNavigate();
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
      await read(created.id);
      await navigate({ to: "/case/$id/confirm", params: { id: created.id } });
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
        <div className="space-y-4 lg:col-span-6 lg:col-start-3">
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
        <aside className="mt-6 flex items-start gap-2 text-muted-foreground text-sm leading-5 lg:col-span-3 lg:mt-0">
          <Lock
            className="mt-0.5 size-5 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <p>
            We only use your bill to check it. We never sell your data. No
            account needed to see results.
          </p>
        </aside>
      </main>
    </>
  );
}
