import { useState } from "react";
import { cn } from "@/lib/utils";
import { portfolio } from "@/data/portfolio";

const categories = ["all", "languages", "frameworks", "databases", "infrastructure"];

export const SkillsSection = () => {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredSkills = portfolio.skills.filter(
    (skill) => activeCategory === "all" || skill.category === activeCategory
  );
  return (
    <section id="skills" className="section-shell section-muted relative px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="section-heading">
          <span className="section-kicker">Skills</span>
          <h2 className="text-3xl font-bold md:text-5xl">Core stack and tools.</h2>
          <p className="mx-auto max-w-3xl text-muted-foreground">
            Technologies are grouped directly from the resume: languages, frameworks,
            databases, and infrastructure.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {categories.map((category, key) => (
            <button
              key={key}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "rounded-full border px-5 py-2 text-sm font-medium uppercase tracking-[0.18em] transition-all duration-300 capitalize",
                activeCategory === category
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_18px_35px_-20px_rgba(14,165,233,0.85)]"
                  : "border-border/70 bg-background/70 text-foreground/75 hover:border-primary/40 hover:text-primary"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filteredSkills.map((skill, key) => (
            <div
              key={key}
              className="card-hover rounded-2xl border border-border/70 bg-card/80 p-4 text-left shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)]"
            >
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-primary">
                {skill.category}
              </div>
              <h3 className="text-base font-semibold">{skill.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
