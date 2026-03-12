import { ArrowRight } from "lucide-react";
import { portfolio } from "@/data/portfolio";

export const HeroSection = () => {
  return (
    <section
      id="hero"
      className="relative flex min-h-[72vh] items-center px-4 pt-24 pb-10 md:min-h-[68vh]"
    >
      <div className="container mx-auto max-w-6xl z-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] xl:gap-10">
          <div className="space-y-5 text-center lg:text-left">
            <div className="opacity-0 animate-fade-in">
              <span className="inline-flex items-center rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-foreground/72">
                {portfolio.title}
              </span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              <span className="block opacity-0 animate-fade-in-delay-1">
                {portfolio.name}
              </span>
              <span className="mt-2 block text-balance text-xl font-medium text-muted-foreground opacity-0 animate-fade-in-delay-2 md:text-2xl">
                Distributed systems, backend services, and applied ML.
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground opacity-0 animate-fade-in-delay-3 lg:mx-0">
              {portfolio.summary}
            </p>

            <div className="flex flex-col items-center gap-3 pt-1 opacity-0 animate-fade-in-delay-4 sm:flex-row lg:items-start">
              <a href="#projects" className="cosmic-button inline-flex items-center gap-2">
                View Projects <ArrowRight size={16} />
              </a>
              <a href={portfolio.links.resume} className="secondary-button">
                Open Resume
              </a>
            </div>
          </div>

          <div className="opacity-0 animate-fade-in-delay-4">
            <div className="hero-panel text-left">
              <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-foreground/70" />
                backend_profile.java
              </div>
              <pre className="overflow-x-auto rounded-2xl bg-[#111827] p-4 text-xs leading-6 text-slate-200 md:text-sm">
                <code>{`Developer yaswanth = new Developer();
yaswanth.focus("Spring Boot", "Kafka", "Redis");
yaswanth.build("Microservices", "ML Pipelines");
yaswanth.optimize("Latency", "Scalability");
yaswanth.deploy("Docker", "Jenkins", "AWS");`}</code>
              </pre>
              <div className="mt-4 text-sm text-muted-foreground">
                Java, Python, JavaScript, distributed systems, and real-time ML.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
