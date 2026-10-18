import { Button } from "@betterbill/ui/components/button";

import { ResponsiveOverlay } from "./responsive-overlay";

type AccountPromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: () => void;
  onSignIn: () => void;
};

export function AccountPrompt({
  open,
  onOpenChange,
  onCreate,
  onSignIn,
}: AccountPromptProps) {
  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title="Save your case to continue"
    >
      <p className="text-base text-muted-foreground leading-6">
        Create a free account to send letters, place calls, and keep track of
        replies. Your results stay the same.
      </p>
      <div className="flex flex-col gap-2">
        <Button className="w-full" onClick={onCreate}>
          Create account
        </Button>
        <Button variant="secondary" className="w-full" onClick={onSignIn}>
          I have an account
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          Not now
        </Button>
      </div>
    </ResponsiveOverlay>
  );
}
