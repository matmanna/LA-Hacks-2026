import { createFileRoute } from "@tanstack/react-router";

import { Closing } from "@/components/landing/closing";
import { Hero, type HeroSample } from "@/components/landing/hero";
import { How } from "@/components/landing/how";
import { Nav } from "@/components/landing/nav";
import { Pricing } from "@/components/landing/pricing";
import { PrivacyFaq } from "@/components/landing/privacy-faq";
import { SiteFooter } from "@/components/landing/site-footer";
import { Tiers } from "@/components/landing/tiers";
import { client } from "@/utils/orpc";

const SAMPLE_CASE_ID = "case-demo";

// The sample figures come from the audit output for the demo bill. The UI
// computes nothing. If the case is unavailable the product visual is omitted.
async function loadSample(): Promise<HeroSample | null> {
  try {
    const detail = await client.case.get({ caseId: SAMPLE_CASE_ID });
    if (!detail.bill || !detail.audit) return null;
    return {
      hospitalName: detail.bill.hospital.name,
      balance: detail.audit.balance,
      confirmedCents: detail.audit.savings.confirmedCents,
      flags: detail.audit.flags,
    };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/")({
  loader: loadSample,
  head: () => ({
    meta: [
      { title: "BetterBill: check your hospital bill, line by line" },
      {
<<<<<<< HEAD
        property: "og:title",
        content: "BetterBill: check your hospital bill, line by line",
      },
      { property: "og:image", content: "/og/consumer.png" },
      { name: "twitter:card", content: "summary_large_image" },
      {
=======
>>>>>>> origin/main
        name: "description",
        content:
          "Snap or paste a hospital bill. See what looks wrong with the proof, and approve every letter before it's sent. Free to check.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const sample = Route.useLoaderData();
  return (
    <>
      <Nav />
      <main>
        <Hero sample={sample} />
        <How />
        <Tiers />
        <Pricing />
        <PrivacyFaq />
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}
