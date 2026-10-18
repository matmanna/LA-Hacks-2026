import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@betterbill/ui/components/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@betterbill/ui/components/sheet";
import { useIsDesktop } from "@betterbill/ui/hooks/use-is-desktop";
import type { ReactNode, RefObject } from "react";

type ResponsiveOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

// Bottom sheet below 1024 px, centered dialog at lg.
export function ResponsiveOverlay({
  open,
  onOpenChange,
  title,
  description,
  initialFocus,
  children,
}: ResponsiveOverlayProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent initialFocus={initialFocus} className="sm:max-w-xl">
          <DialogTitle className="font-semibold text-[22px] leading-[28px]">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="sr-only">
              {description}
            </DialogDescription>
          ) : null}
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        initialFocus={initialFocus}
        className="gap-4 px-5 pt-5 pb-[calc(24px+env(safe-area-inset-bottom))]"
      >
        <SheetTitle className="font-semibold text-[22px] leading-[28px]">
          {title}
        </SheetTitle>
        {description ? (
          <SheetDescription className="sr-only">{description}</SheetDescription>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
