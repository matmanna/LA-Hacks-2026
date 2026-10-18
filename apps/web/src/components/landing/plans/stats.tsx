import { useSeenOnce } from "../motion";
import { useCountUp } from "./count";
import type { EvalView } from "./eval-data";

function Stat({
  to,
  run,
  suffix = "",
  decimals = 0,
  label,
  caption,
}: {
  to: number;
  run: boolean;
  suffix?: string;
  decimals?: number;
  label: string;
  caption: string;
}) {
  const v = useCountUp(to, run);
  return (
    <div className="border-t pt-4">
      <p className="font-serif text-[44px] tabular-nums leading-[48px] lg:text-[56px] lg:leading-[60px]">
        {v.toFixed(decimals)}
        <span className="text-[0.55em] text-muted-foreground">{suffix}</span>
      </p>
      <p className="mt-1 font-medium text-base leading-6">{label}</p>
      <p className="mt-0.5 text-muted-foreground text-sm leading-5">
        {caption}
      </p>
    </div>
  );
}

// Headline numbers straight from the evaluation run.
export function PlansStats({ data }: { data: EvalView | null }) {
  const [ref, seen] = useSeenOnce<HTMLDivElement>(0.3);
  if (!data) return null;
  const when = data.date ? `, ${data.date}` : "";
  return (
    <section className="border-y bg-card px-5 py-12 md:px-8 lg:py-16">
      <div ref={ref} className="mx-auto max-w-6xl">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.08em]">
          Measured on synthetic bills{when}
        </p>
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            to={data.caught}
            run={seen}
            suffix={` of ${data.expected}`}
            label="seeded errors found"
            caption={`Planted by the team across ${data.bills} bills.`}
          />
          <Stat
            to={data.falseFlags}
            run={seen}
            label="false flags on clean bills"
            caption={`Checked on ${data.cleanBills} clean bills.`}
          />
          {data.auditP50Ms !== null ? (
            <Stat
              to={data.auditP50Ms}
              run={seen}
              decimals={3}
              suffix=" ms"
              label="median audit time"
              caption="A deterministic rules engine. No model in the loop."
            />
          ) : null}
          {data.botm ? (
            <Stat
              to={data.botm.caught}
              run={seen}
              suffix={` of ${data.botm.inScope}`}
              label="published findings matched"
              caption={`In-scope reporter findings from ${data.botm.cases} recreated cases.`}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
