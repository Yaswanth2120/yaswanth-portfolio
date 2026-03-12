import { ArrowUp } from "lucide-react";
import { portfolio } from "@/data/portfolio";

export const Footer = () => {
  return (
    <footer className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-border/70 bg-card/60 px-4 py-8">
      <p className="text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} {portfolio.name}. All rights reserved.
      </p>
      <a
        href="#hero"
        className="rounded-full bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
      >
        <ArrowUp size={20} />
      </a>
    </footer>
  );
};
