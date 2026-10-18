import { Button } from "@betterbill/ui/components/button";
import { Checkbox } from "@betterbill/ui/components/checkbox";
import { LoaderCircle } from "lucide-react";
import { useRef } from "react";

import { ResponsiveOverlay } from "./responsive-overlay";

type ApprovalSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "letter" | "itemized_request" | "call";
  recipient: string;
  channelDetail: string;
  text: string;
  dataShared: string[];
  pending?: boolean;
  onApprove: () => void;
  // Calls only: Approve stays disabled until the person's consent is confirmed.
  consent?: { checked: boolean; onCheckedChange: (checked: boolean) => void };
};

const CALL_OPENING =
  "Hi, this is an automated assistant calling on behalf of a patient.";

export function ApprovalSheet({
  open,
  onOpenChange,
  kind,
  recipient,
  channelDetail,
  text,
  dataShared,
  pending,
  onApprove,
  consent,
}: ApprovalSheetProps) {
  const isCall = kind === "call";
  const headingRef = useRef<HTMLHeadingElement>(null);

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={isCall ? "Review before we call" : "Review before we send"}
      description="Read the exact words. Nothing goes out until you approve."
      initialFocus={headingRef}
    >
      <section className="space-y-1">
        <h3 className="font-semibold text-sm leading-5">To</h3>
        <p className="text-sm leading-5">{recipient}</p>
        <p className="text-muted-foreground text-xs leading-4">
          {channelDetail}
        </p>
      </section>

      <section className="space-y-2">
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="font-semibold text-sm leading-5 outline-none"
        >
          {isCall ? "What we'll say" : "What we'll send"}
        </h3>
        <textarea
          readOnly
          value={text}
          aria-label={isCall ? "Call script" : "Letter text"}
          className="field-sizing-content block max-h-[40svh] w-full resize-none overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted p-4 font-sans text-sm leading-6"
        />
      </section>

      <section className="space-y-1">
        <h3 className="font-semibold text-sm leading-5">What we'll share</h3>
        <ul className="list-disc space-y-0.5 pl-5 text-sm leading-5">
          {dataShared.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <p className="text-muted-foreground text-xs leading-4">
        Nothing is sent until you tap Approve. We save your approval with the
        time.
        {isCall ? ` The call starts with: "${CALL_OPENING}"` : null}
      </p>

      {consent ? (
        // biome-ignore lint/a11y/noLabelWithoutControl: Checkbox renders the input
        <label className="flex min-h-11 items-start gap-3 text-sm leading-5">
          <Checkbox
            className="mt-0.5"
            checked={consent.checked}
            onCheckedChange={(checked) =>
              consent.onCheckedChange(checked === true)
            }
          />
          The person at this number agreed to take a test call.
        </label>
      ) : null}

      <div className="flex flex-col gap-2 lg:flex-row-reverse lg:justify-start">
        <Button
          className="w-full lg:w-auto"
          disabled={pending || (consent !== undefined && !consent.checked)}
          onClick={onApprove}
        >
          {pending ? (
            <>
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              {isCall ? "Calling" : "Sending"}
            </>
          ) : isCall ? (
            "Approve and call"
          ) : (
            "Approve and send"
          )}
        </Button>
        <Button
          variant="secondary"
          className="w-full lg:w-auto"
          onClick={() => onOpenChange(false)}
        >
          Not now
        </Button>
      </div>
    </ResponsiveOverlay>
  );
}
