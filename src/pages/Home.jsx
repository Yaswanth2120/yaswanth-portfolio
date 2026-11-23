import { lazy, Suspense, useEffect, useState } from "react";
import { content } from "@/data/content";
import { measureScrollStop, scroll } from "@/lib/scroll";

const OfficeScene = lazy(() => import("@/scene/OfficeScene"));
const pad = (n) => String(n).padStart(2, "0");

function Header() {
  const { logo, nav, email } = content.header;
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/90">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-5 md:px-12">
        <a href="#top" className="font-serif text-2xl font-medium tracking-tight text-primary">
          {logo}
        </a>
        <nav className="flex items-center gap-5 md:gap-10">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="label-mono link-line text-primary/70 hover:text-primary">
              {item.label}
            </a>
          ))}
          <a href={`mailto:${email}`} className="label-mono link-line hidden normal-case tracking-normal text-primary lg:inline">
            {email}
          </a>
        </nav>
      </div>
    </header>
  );
}

/** Each [data-stop] section is one point on the 3D scroll timeline. */
function Stop({ id, children }) {
  return (
    <section data-stop id={id} className="flex min-h-svh items-end px-4 pb-6 pt-20 md:items-center md:px-12 md:pb-0">
      {children}
    </section>
  );
}

function Panel({ children }) {
  return <div className="reveal panel pointer-events-auto w-full max-w-lg p-6 md:p-10">{children}</div>;
}

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".reveal"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.setAttribute("data-visible", String(e.isIntersecting))),
      { threshold: 0.2 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Story() {
  useReveal();
  const { intro, projects, experience, education, contact } = content;

  return (
    <main className="pointer-events-none relative z-10">
      <section data-stop id="top" className="flex min-h-svh flex-col justify-end px-5 pb-[8vh] pt-24 md:px-12">
        <h1 className="font-serif text-[clamp(3.4rem,10.5vw,11.5rem)] font-light leading-[0.86] tracking-[-0.02em] text-primary">
          {intro.name}
        </h1>
        <div className="mt-8 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
          <p className="font-mono text-sm tracking-[0.42em] text-primary md:text-base">{intro.role}</p>
          <p className="label-mono hidden text-primary/35 md:block">{intro.scrollHint} ↓</p>
        </div>
      </section>

      <div id="projects">
        {projects.items.map((project, i) => (
          <Stop key={project.name}>
            <Panel>
              <div className="flex items-baseline justify-between gap-4">
                <p className="label-mono text-primary/70">
                  {projects.eyebrow} — {pad(i + 1)} / {pad(projects.items.length)}
                </p>
                {project.badge && <p className="label-mono text-primary">{project.badge}</p>}
              </div>
              <h2 className="mt-4 font-serif text-5xl font-light leading-[0.95] md:mt-6 md:text-7xl">{project.name}</h2>
              <p className="mt-4 leading-relaxed text-primary/70 md:text-lg">{project.summary}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {project.stack.map((tech) => (
                  <li key={tech} className="label-mono border border-border px-2.5 py-1.5 text-primary">
                    {tech}
                  </li>
                ))}
              </ul>
              <a href={project.github} target="_blank" rel="noreferrer" className="btn-line mt-7">
                {projects.linkLabel} <span aria-hidden="true">↗</span>
              </a>
            </Panel>
          </Stop>
        ))}
      </div>

      <div id="experience">
        {experience.items.map((job, i) => (
          <Stop key={job.org}>
            <Panel>
              <div className="flex items-baseline justify-between gap-4">
                <p className="label-mono text-primary/70">
                  {experience.eyebrow} — {pad(i + 1)} / {pad(experience.items.length)}
                </p>
                <p className="label-mono text-right text-primary">{job.period}</p>
              </div>
              <h2 className="mt-4 font-serif text-5xl font-light leading-[0.95] md:mt-6 md:text-7xl">{job.org}</h2>
              <p className="mt-3 font-mono text-sm tracking-wide text-primary">{job.role}</p>
              <p className="label-mono mt-2 text-primary/35">{job.place}</p>
              {job.summary && <p className="mt-4 leading-relaxed text-primary/70 md:text-lg">{job.summary}</p>}
              {i === experience.items.length - 1 && (
                <div className="mt-6 space-y-3 border-t border-border pt-5">
                  <p className="label-mono text-primary/70">Education</p>
                  {education.map((ed) => (
                    <div key={ed.degree}>
                      <p className="font-serif text-xl leading-tight">{ed.degree}</p>
                      <p className="text-sm text-primary/70">
                        {ed.school} · {ed.period}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </Stop>
        ))}
      </div>

      {/* Last stop: the merged figure at his desk, with a compact inverted contact panel below. */}
      <section data-stop id="contact" className="flex min-h-svh flex-col justify-end px-4 pb-6 pt-24 md:px-12 md:pb-10">
        <div className="reveal pointer-events-auto grid gap-8 bg-primary p-6 text-background md:grid-cols-[1.4fr_1fr] md:items-end md:p-12">
          <div>
            <p className="label-mono text-background/70">{contact.eyebrow}</p>
            <h2 className="mt-4 font-serif text-4xl font-light leading-[0.98] md:text-6xl">{contact.heading}</h2>
            <a
              href={`mailto:${contact.email}`}
              className="link-line mt-5 inline-block break-all font-serif text-2xl decoration-background/35 hover:decoration-background md:text-3xl"
            >
              {contact.email}
            </a>
          </div>
          <div className="flex flex-col gap-6 md:items-end">
            <div className="flex flex-wrap gap-3">
              {contact.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className={link.primary ? "btn-key-inverse" : "btn-line-inverse"}
                >
                  {link.label}
                </a>
              ))}
            </div>
            <p className="label-mono text-background/50">{contact.footer}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export const Home = () => {
  const [env, setEnv] = useState(null);
  // { index, clicks }: clicking the same agent again advances to its next feature.
  const [selected, setSelected] = useState(null);
  const selectAgent = (index) =>
    setSelected((prev) => (index === null ? null : { index, clicks: prev?.index === index ? prev.clicks + 1 : 0 }));

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onEnv = () => {
      scroll.mobile = mobileQuery.matches;
      scroll.reduced = motionQuery.matches;
      setEnv({ mobile: mobileQuery.matches, reduced: motionQuery.matches });
    };
    const onScroll = () => {
      scroll.s = measureScrollStop();
      scroll.listeners.forEach((fn) => fn());
      // Role cards only exist on the home screen; close one once the visitor scrolls on.
      if (scroll.s > 0.45) setSelected(null);
    };
    onEnv();
    onScroll();
    mobileQuery.addEventListener("change", onEnv);
    motionQuery.addEventListener("change", onEnv);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      mobileQuery.removeEventListener("change", onEnv);
      motionQuery.removeEventListener("change", onEnv);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (selected === null) return;
    const onKey = (e) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <div className="relative bg-background text-foreground">
      {env && (
        <Suspense fallback={null}>
          {/* Remount the scene when the device class or motion preference changes. */}
          <OfficeScene
            key={`${env.mobile}-${env.reduced}`}
            mobile={env.mobile}
            reduced={env.reduced}
            selected={selected}
            onSelect={selectAgent}
          />
        </Suspense>
      )}
      <Header />
      <Story />
    </div>
  );
};
