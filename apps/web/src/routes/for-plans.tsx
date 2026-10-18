import { createFileRoute } from "@tanstack/react-router";
import { AudienceBar } from "@/components/landing/audience-bar";
import { BulkPlan } from "@/components/landing/plans/bulk-plan";
import { evalView } from "@/components/landing/plans/eval-data";
import { PlansEvidence } from "@/components/landing/plans/evidence";
import { Fit } from "@/components/landing/plans/fit";
import { PlansHero, type PlansSample } from "@/components/landing/plans/hero";
import { Integration } from "@/components/landing/plans/integration";
import { PlansMap } from "@/components/landing/plans/map";
import { PlansNav } from "@/components/landing/plans/nav";
import { PilotForm } from "@/components/landing/plans/pilot-form";
import { Pipeline } from "@/components/landing/plans/pipeline";
import { PlansResults } from "@/components/landing/plans/results";
import { Security } from "@/components/landing/plans/security";
import { PlansStats } from "@/components/landing/plans/stats";
import { SiteFooter } from "@/components/landing/site-footer";
import { client } from "@/utils/orpc";

const SAMPLE_CASE_ID = "case-demo";

async function loadPage() {
  const [detail, events, results] = await Promise.allSettled([
    client.case.get({ caseId: SAMPLE_CASE_ID }),
    client.event.list({ caseId: SAMPLE_CASE_ID }),
    client.eval.results({}),
  ]);

  let sample: PlansSample | null = null;
  if (
    detail.status === "fulfilled" &&
    detail.value.bill &&
    detail.value.audit
  ) {
    sample = {
      hospitalName: detail.value.bill.hospital.name,
      lines: detail.value.bill.lines,
      flags: detail.value.audit.flags.slice(0, 4),
      totalCents: detail.value.bill.totals.chargesCents,
      events: (events.status === "fulfilled" ? events.value : []).map((e) => ({
        id: e.id,
        at: e.at,
        actor: e.actor,
        summary: e.summary,
      })),
    };
  }
  return {
    sample,
    results:
      results.status === "fulfilled"
        ? (results.value as Record<string, unknown>)
        : null,
  };
}

export const Route = createFileRoute("/for-plans")({
  loader: loadPage,
  head: () => ({
    meta: [
      { title: "BetterBill for plans: evidence-first bill review" },
      {
        property: "og:title",
        content: "BetterBill for plans: evidence-first bill review",
      },
      { property: "og:image", content: "/og/plans.png" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "description",
        content:
          "Line-by-line hospital bill review with evidence tiers and an audit trail, for self-funded employers, TPAs, and plans.",
      },
    ],
  }),
  component: ForPlans,
});

function ForPlans() {
  const { sample, results } = Route.useLoaderData();
  const data = evalView(results);
  return (
    <>
      <AudienceBar audience="plans" />
      <PlansNav />
      <main>
        <PlansHero sample={sample} />
        <PlansStats data={data} />
        <Fit />
        <Pipeline />
        <PlansEvidence />
        <PlansResults data={data} />
        <PlansMap />
        <Integration />
        <Security />
        <BulkPlan />
        <PilotForm />
      </main>
      <SiteFooter audience="plans" />
    </>
  );
}
