import { cn } from "@betterbill/ui/lib/utils";
import { Check, FileText, Mail, Phone } from "lucide-react";

type TimelineEvent = {
  id: string;
  at: string;
  summary: string;
  actor: "user" | "agent" | "system";
  done: boolean;
};

type ActivityTimelineProps = {
  current?: { title: string; detail: string; icon: "phone" | "mail" | "file" };
  events: TimelineEvent[];
  className?: string;
};

const ICONS = { phone: Phone, mail: Mail, file: FileText } as const;
const ACTOR = { user: "by you", agent: "by BetterBill", system: "automatic" };

const timeFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function ActivityTimeline({
  current,
  events,
  className,
}: ActivityTimelineProps) {
  const CurrentIcon = current ? ICONS[current.icon] : null;
  return (
    <div className={cn("space-y-6", className)}>
      {current && CurrentIcon ? (
        <div className="flex gap-3 rounded-2xl bg-muted p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <CurrentIcon
              className="size-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </span>
          <div>
            <p className="font-semibold text-base leading-6">{current.title}</p>
            <p className="text-muted-foreground text-sm leading-5">
              {current.detail}
            </p>
          </div>
        </div>
      ) : null}
      <ol aria-label="Case activity" className="relative">
        {events.map((event, index) => (
          <li key={event.id} className="relative pb-6 pl-10 last:pb-0">
            {index < events.length - 1 ? (
              <span
                className={cn(
                  "absolute top-8 bottom-0 left-[15px] w-px",
                  event.done ? "bg-mint" : "bg-border",
                )}
                aria-hidden="true"
              />
            ) : null}
            {event.done ? (
              <span className="absolute top-0 left-0 flex size-8 items-center justify-center rounded-full border-2 border-mint bg-background text-mint">
                <Check className="size-4" strokeWidth={2} aria-hidden="true" />
              </span>
            ) : (
              <span
                className="absolute top-0 left-0 size-8 rounded-full border-2 border-border bg-background"
                aria-hidden="true"
              />
            )}
            <p className="text-base leading-6">
              <span className="sr-only">
                {event.done ? "Done: " : "Next: "}
              </span>
              {event.summary}
            </p>
            <p className="text-muted-foreground text-xs leading-4">
              {timeFormat.format(new Date(event.at))} · {ACTOR[event.actor]}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
