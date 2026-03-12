import {
  Download,
  Mail,
  FileText,
  Github,
  Linkedin,
  MapPin,
  Phone,
} from "lucide-react";
import { portfolio } from "@/data/portfolio";

const contactCards = [
  {
    title: "LinkedIn",
    description: "Professional profile and networking.",
    href: portfolio.links.linkedin,
    label: "Open LinkedIn",
    icon: Linkedin,
  },
  {
    title: "GitHub",
    description: "Code samples and public work.",
    href: portfolio.links.github,
    label: "Open GitHub",
    icon: Github,
  },
  {
    title: "Resume",
    description: "View or download the latest resume PDF.",
    href: portfolio.links.resumeFile,
    label: "Download Resume",
    icon: Download,
  },
];

export const ContactSection = () => {
  return (
    <section id="contact" className="section-shell section-muted relative px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="section-heading">
          <span className="section-kicker">Contact</span>
          <h2 className="text-3xl font-bold md:text-5xl">Let&apos;s connect.</h2>
          <p className="mx-auto max-w-3xl text-muted-foreground">
            Direct contact details, resume access, and profile links from the
            updated portfolio.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
          <div className="rounded-[24px] border border-border/70 bg-card/85 p-6 text-left shadow-[0_28px_80px_-46px_rgba(15,23,42,0.7)]">
            <div className="mb-4 inline-flex rounded-full border border-primary/25 bg-primary/10 p-3 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold">{portfolio.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{portfolio.summary}</p>

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                    Email
                  </div>
                  <a
                    href={`mailto:${portfolio.email}`}
                    className="mt-1 block font-medium hover:text-primary"
                  >
                    {portfolio.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                    Phone
                  </div>
                  <a
                    href={`tel:${portfolio.phone.replace(/[^+\d]/g, "")}`}
                    className="mt-1 block font-medium hover:text-primary"
                  >
                    {portfolio.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                    Location
                  </div>
                  <div className="mt-1 font-medium">{portfolio.location}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {contactCards.map((card) => {
              const Icon = card.icon;

              return (
                <a
                  key={card.title}
                  href={card.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-44 flex-col justify-between rounded-[24px] border border-border/70 bg-background/78 p-5 text-left shadow-[0_24px_70px_-50px_rgba(15,23,42,0.72)] card-hover"
                >
                  <div>
                    <div className="mb-4 inline-flex rounded-full bg-primary/10 p-3 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                  <span className="mt-6 text-sm uppercase tracking-[0.18em] text-primary">
                    {card.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
