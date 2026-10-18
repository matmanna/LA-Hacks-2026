import { Button } from "@betterbill/ui/components/button";
import { Link } from "@tanstack/react-router";

import { useStartSample } from "@/hooks/use-start-sample";
import { ArrowSlide } from "./arrow-slide";

export function Closing() {
  const start = useStartSample();
  return (
    <section className="py-16 lg:py-28">
      <div className="mx-5 rounded-3xl bg-ink px-6 py-14 text-center text-white md:mx-8 lg:px-16 lg:py-20">
        <h2 className="mx-auto max-w-[18ch] text-balance font-serif text-[40px] leading-[44px] lg:text-[64px] lg:leading-[68px]">
          Check your bill before you pay it.
          <svg
            viewBox="0 0 16 16"
            className="ml-2 inline-block size-8 text-mint lg:size-12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2.5 8.8 6.2 12.4 13.5 3.6" />
          </svg>
        </h2>
        <p className="mt-4 text-base text-white/75 leading-6 lg:text-lg lg:leading-7">
          It's free, and nothing is sent without you.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            nativeButton={false}
            render={<Link to="/check" />}
          >
            Check my bill
            <ArrowSlide />
          </Button>
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={start.pending}
            onClick={start.start}
          >
            Try a sample bill
          </Button>
        </div>
        <div className="mx-auto mt-8 grid max-w-3xl gap-3 text-left text-sm sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <p className="font-semibold">Web</p>
            <p className="mt-1 text-white/70">
              Open BetterBill in any browser.
            </p>
          </div>
          <a
            href="https://github.com/matmanna/betterbill/releases/latest"
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-white/15 bg-white/10 p-4 transition-colors hover:bg-white/15"
          >
            <p className="font-semibold">Android</p>
            <p className="mt-1 text-white/70">
              Download the latest APK and install it on your phone.
            </p>
          </a>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <p className="font-semibold">iPhone</p>
            <p className="mt-1 text-white/70">
              Use Expo Go to try the current mobile preview.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
