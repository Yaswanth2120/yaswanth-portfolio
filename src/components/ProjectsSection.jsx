import { ArrowRight, ExternalLink, Github } from "lucide-react";
import { portfolio } from "@/data/portfolio";

export const ProjectsSection = () => {
  return (
    <section id="projects" className="section-shell relative px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="section-heading">
          <span className="section-kicker">Projects</span>
          <h2 className="text-3xl font-bold md:text-5xl">Selected work.</h2>
          <p className="mx-auto max-w-3xl text-muted-foreground">
            These projects cover management systems, community-driven products,
            and full-stack commerce workflows built with the technologies highlighted above.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {portfolio.projects.map((project) => (
            <div
              key={project.title}
              className="group overflow-hidden rounded-[24px] border border-border/70 bg-card/80 shadow-[0_28px_80px_-46px_rgba(15,23,42,0.7)] card-hover"
            >
              <div className="h-40 overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>

              <div className="p-5">
                <div className="mb-3 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/70 bg-background/65 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <h3 className="mb-2 text-lg font-semibold">{project.title}</h3>
                <p className="mb-4 text-sm leading-6 text-muted-foreground">
                  {project.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex space-x-3">
                    <a
                      href={portfolio.links.github}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground/80 transition-colors duration-300 hover:text-primary"
                      aria-label={`Open ${project.title} source profile`}
                    >
                      <Github size={20} />
                    </a>
                    <a
                      href={portfolio.links.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground/80 transition-colors duration-300 hover:text-primary"
                      aria-label={`Open ${project.title} professional profile`}
                    >
                      <ExternalLink size={20} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            className="cosmic-button mx-auto flex w-fit items-center gap-2"
            target="_blank"
            rel="noreferrer"
            href={portfolio.links.github}
          >
            Check My GitHub <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
};
