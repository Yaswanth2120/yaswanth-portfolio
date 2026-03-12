import { ArrowRight } from "lucide-react";
import { portfolio } from "@/data/portfolio";

export const HeroSection = () => {
  return (
    <section
      id="hero"
      className="relative flex min-h-[72vh] items-center px-4 pt-24 pb-10 md:min-h-[68vh]"
    >
      <div className="container mx-auto max-w-6xl z-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.9fr] xl:gap-10">
          <div className="space-y-5 text-center lg:text-left">
            <div className="opacity-0 animate-fade-in">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.24em] text-primary">
                {portfolio.title}
              </span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              <span className="block opacity-0 animate-fade-in-delay-1">
                {portfolio.name}
              </span>
              <span className="mt-2 block text-balance text-xl font-medium text-muted-foreground opacity-0 animate-fade-in-delay-2 md:text-2xl">
                Building clean, useful products across the stack.
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
              <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                backend_profile.java
              </div>
              <pre className="overflow-x-auto rounded-2xl bg-slate-950/92 p-4 text-xs leading-6 text-slate-200 md:text-sm">
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
