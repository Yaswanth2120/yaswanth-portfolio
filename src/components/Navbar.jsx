import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { portfolio } from "@/data/portfolio";

const navItems = [
  { name: "Home", href: "#hero" },
  { name: "Experience", href: "#about" },
  { name: "Skills", href: "#skills" },
  { name: "Projects", href: "#projects" },
  { name: "Contact", href: "#contact" },
];

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        isScrolled
          ? "py-3 bg-background/88 backdrop-blur-xl border-b border-border/70"
          : "py-4"
      )}
    >
      <div className="container flex items-center justify-between gap-6">
        <a
          className="flex items-center text-base font-semibold tracking-[0.02em] text-foreground"
          href="#hero"
        >
          <span className="relative z-10 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-sm font-semibold text-foreground">
              Y
            </span>
            <span>{portfolio.shortName} Portfolio</span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item, key) => (
            <a
              key={key}
              href={item.href}
              className="text-sm text-foreground/72 transition-colors duration-300 hover:text-foreground"
            >
              {item.name}
            </a>
          ))}
          <a href={portfolio.links.resume} className="cosmic-button">
            Resume
          </a>
          <ThemeToggle />
        </div>

        <button
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="md:hidden p-2 text-foreground z-50"
          aria-label={isMenuOpen ? "Close Menu" : "Open Menu"}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}{" "}
        </button>

        <div
          className={cn(
            "fixed inset-0 z-40 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md",
            "transition-all duration-300 md:hidden",
            isMenuOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          )}
        >
          <div className="flex flex-col space-y-8 text-xl">
            {navItems.map((item, key) => (
              <a
                key={key}
                href={item.href}
                className="text-foreground/80 transition-colors duration-300 hover:text-foreground"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            <a
              href={portfolio.links.resume}
              className="cosmic-button text-center"
              onClick={() => setIsMenuOpen(false)}
            >
              Resume
            </a>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};
