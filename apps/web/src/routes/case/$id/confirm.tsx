import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/case/$id/confirm")({
  component: () => (
    <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      <h1 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em]">
        Check what we read
      </h1>
    </main>
  ),
});
