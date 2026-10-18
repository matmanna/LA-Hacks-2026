import { Wordmark } from "@betterbill/ui/components/bb/wordmark";
import { Button } from "@betterbill/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

type AppBarProps = {
  title?: string;
  back?: string;
};

export function AppBar({ title, back }: AppBarProps) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:px-8">
        <div className="flex items-center gap-1">
          {back ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back"
              nativeButton={false}
              render={<Link to={back} />}
            >
              <ChevronLeft strokeWidth={1.75} aria-hidden="true" />
            </Button>
          ) : null}
          <Wordmark />
          {title ? (
            <>
              <span className="text-muted-foreground" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-base">{title}</span>
            </>
          ) : null}
        </div>
        <Link
          to="/cases"
          className="py-3 text-primary text-sm underline-offset-4 hover:underline"
        >
          Your bills
        </Link>
      </div>
    </header>
  );
}
