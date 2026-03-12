import { Briefcase, Code, User } from "lucide-react";
import { Spotlight } from "../components/ui/Spotlight";
import { portfolio } from "@/data/portfolio";

const icons = [Code, User, Briefcase];

export const AboutSection = () => {
  return (
    <section id="about" className="section-shell relative px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="section-heading">
          <span className="section-kicker">Experience</span>
          <h2 className="text-3xl md:text-5xl font-bold text-balance">
            Education and recent work in one view.
          </h2>
          <p className="mx-auto max-w-3xl text-muted-foreground">
            {portfolio.intro}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.35fr]">
          <div className="rounded-[24px] border border-border/70 bg-card/82 p-5 text-left shadow-[0_24px_70px_-50px_rgba(15,23,42,0.72)]">
            <h3 className="mb-4 text-xl font-semibold">Education</h3>
            <div className="space-y-4">
              {portfolio.education.map((item) => (
                <div key={item.school} className="border-l-2 border-primary/30 pl-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-primary">
                    {item.period}
                  </div>
                  <h4 className="mt-2 text-lg font-semibold">{item.school}</h4>
                  <p className="text-muted-foreground">{item.degree}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.location}</p>
                </div>
              ))}
            </div>
          </div>

          <Spotlight className="grid grid-cols-1 gap-4">
            {portfolio.experience.map((item, index) => {
              const Icon = icons[index] ?? Briefcase;

              return (
                <div key={item.role} className="gradient-border card-hover p-5 text-left">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2.5">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-primary">
                        {item.period}
                      </div>
                      <h4 className="mt-1 text-lg font-semibold">{item.role}</h4>
                      <p className="text-muted-foreground">{item.company}</p>
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {item.highlights.map((point) => (
                      <li key={point} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </Spotlight>
        </div>
      </div>
    </section>
  );
};
