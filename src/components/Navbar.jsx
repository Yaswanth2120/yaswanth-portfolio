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
          ? "py-3 bg-background/78 backdrop-blur-xl border-b border-border/60 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.45)]"
          : "py-5"
      )}
    >
      <div className="container flex items-center justify-between gap-6">
        <a
          className="flex items-center text-lg font-semibold uppercase tracking-[0.18em] text-foreground"
          href="#hero"
        >
          <span className="relative z-10 flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_20px_rgba(14,165,233,0.8)]" />
            {portfolio.shortName}
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item, key) => (
            <a
              key={key}
              href={item.href}
              className="text-sm uppercase tracking-[0.18em] text-foreground/72 transition-colors duration-300 hover:text-primary"
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
                className="text-foreground/80 hover:text-primary transition-colors duration-300"
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
