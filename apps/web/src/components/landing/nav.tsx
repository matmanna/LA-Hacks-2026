import { Wordmark } from "@betterbill/ui/components/bb/wordmark";
import { Button } from "@betterbill/ui/components/button";
import { cn } from "@betterbill/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowSlide } from "./arrow-slide";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#evidence", label: "Evidence" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-16 border-b bg-background/90 backdrop-blur",
        scrolled ? "border-border" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <a href="/" aria-label="BetterBill home">
          <Wordmark />
        </a>
        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground text-sm hover:text-foreground focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <Button
          size="sm"
          className="lg:h-11 lg:justify-self-end lg:rounded-xl lg:px-5 lg:text-base"
          nativeButton={false}
          render={<Link to="/check" />}
        >
          Check my bill
          <ArrowSlide />
        </Button>
      </div>
    </header>
  );
}
