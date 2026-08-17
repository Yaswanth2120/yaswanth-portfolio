const projects = [
  { title: "Veya AI", description: "Whisper transcription, document RAG, and Ollama LLM inference — grounded response generation with voice activity detection and JSONL IPC, all running locally.", stack: ["SwiftUI", "Python", "Whisper", "Ollama", "VAD"], kind: "voice" },
  { title: "Intelligent\nAPI Gateway", description: "A distributed API gateway with JWT authentication, Redis rate limiting, circuit breakers, request tracing, and React-based monitoring.", stack: ["Java", "Spring Cloud Gateway", "Redis", "React"], kind: "gateway" },
  { title: "DocuIntel AI", description: "A multi-user RAG platform — document ingestion, embeddings, vector retrieval, contextual prompt construction, grounded generation, and access isolation.", stack: ["FastAPI", "LangChain", "OpenAI", "ChromaDB", "Supabase"], kind: "rag" },
  { title: "DeployGuard AI", description: "A deployment intelligence platform that asynchronously compares software releases and generates regression and deployment-risk signals.", stack: ["FastAPI", "Spring Boot", "RabbitMQ", "PostgreSQL", "Next.js"], kind: "deploy" },
];

const experience = [
  ["Agile Technologies", "Software Engineer", "Mar 2026 — Present", "Cottonwood, AZ"],
  ["Auburn University", "Graduate Research Assistant", "Jan 2025 — Aug 2025", "Montgomery, AL"],
  ["ITC Infotech", "Software Developer", "Jul 2022 — Nov 2023", "Kolkata, India"],
  ["SoftSuave Technologies", "Software Engineering Intern", "May 2021 — Jun 2022", "Bangalore, India"],
];

function Diagram({ kind }) {
  if (kind === "voice") return <div className="diagram voice"><div className="wave">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ height: `${14 + ((index * 17) % 47)}px`, animationDelay: `-${(index % 7) * .14}s` }} />)}</div><span>AUDIO → SEGMENTS → TOKENS</span></div>;
  if (kind === "gateway") return <div className="diagram gateway"><svg viewBox="0 0 680 210" aria-hidden="true"><path d="M15 105H282M374 105H655M375 105L602 20M375 105L602 190" /><path className="route-pulse pulse-a" d="M15 105H282M374 105L602 20" /><path className="route-pulse pulse-b" d="M15 105H282M374 105L602 190" /><circle className="gateway-core" cx="329" cy="105" r="47" /><circle className="gateway-in" cx="15" cy="105" r="8" /><circle className="gateway-out" cx="615" cy="20" r="8" /></svg><span>AUTH · RATE LIMIT · ROUTE</span></div>;
  if (kind === "rag") return <div className="diagram rag"><svg viewBox="0 0 680 240" aria-hidden="true"><path d="M42 118L210 24M42 118L195 150M42 118L443 172M42 210H658" /><path className="retrieval-path" d="M42 118L210 24" /><path className="retrieval-path delayed" d="M42 118L443 172" /><circle className="query-node" cx="42" cy="118" r="10" />{[[210, 24], [195, 150], [300, 75], [443, 172], [570, 55], [615, 196], [420, 45]].map(([x, y], index) => <rect className={`rag-node node-${index}`} key={index} x={x} y={y} width="16" height="16" />)}</svg><span>QUERY</span></div>;
  return <div className="diagram deploy"><svg viewBox="0 0 700 235" aria-hidden="true"><path d="M12 118H274C370 118 408 40 580 40H685M274 118C388 118 401 196 685 196" /><path className="compare-line" d="M12 118H274C370 118 408 40 580 40H685" /><path className="compare-line lower" d="M274 118C388 118 401 196 685 196" /><circle className="risk-node" cx="535" cy="121" r="8" /></svg><span>R1 / R2</span><b>Δ RISK SIGNAL</b></div>;
}

const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

export const Home = () => {
  const [activeProject, setActiveProject] = useState(0);
  const stepRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveProject(Number(entry.target.dataset.projectIndex));
      }),
      { threshold: 0.55 }
    );

    stepRefs.current.forEach((step) => step && observer.observe(step));
    return () => observer.disconnect();
  }, []);

  return <main>
    <header><button onClick={() => go("top")}>YSV.</button><nav><button onClick={() => go("projects")}>Projects</button><button onClick={() => go("experience")}>Experience</button><button onClick={() => go("about")}>About</button></nav><a href="mailto:yaswanthsai2120@gmail.com">yaswanthsai2120@gmail.com ↗</a></header>
    <section id="top" className="intro"><div className="intro-signal" aria-hidden="true"><i /><i /><i /><i /><i /></div><p className="mono">SOFTWARE ENGINEER</p><h1>Yaswanth<br />Sai Venkatesan</h1><div className="intro-meta"><p>Cottonwood, Arizona</p><p>Selected work · experience · education</p><button onClick={() => go("projects")}>SCROLL ↓</button></div></section>
    <section id="projects" className="projects"><div className="project-stage"><div className="project-guide" aria-hidden="true" />{projects.map((project, projectIndex) => <article className={`project-case ${activeProject === projectIndex ? "is-active" : ""}`} key={project.title} aria-hidden={activeProject !== projectIndex}><span className="project-marker" aria-hidden="true">0{projectIndex + 1}</span><div className="project-copy"><div className="case-meta"><span>0{projectIndex + 1}</span>{projectIndex === 0 && <span>649 AUTOMATED TESTS</span>}</div><h2>{project.title.split("\n").map((line, lineIndex) => <span key={line}>{line}{lineIndex === 0 && project.title.includes("\n") && <br />}</span>)}</h2><p className="description">{project.description}</p><p className="stack">{project.stack.join(" · ")}</p><a href="https://github.com/Yaswanth2120" target="_blank" tabIndex={activeProject === projectIndex ? 0 : -1}>VIEW ON GITHUB ↗</a></div><Diagram kind={project.kind} /></article>)}</div><div className="project-scroll-steps" aria-hidden="true">{projects.map((project, projectIndex) => <div className="project-scroll-step" data-project-index={projectIndex} key={project.title} ref={(element) => { stepRefs.current[projectIndex] = element; }} />)}</div></section>
    <section id="experience" className="experience"><p className="mono">EXPERIENCE</p><div>{experience.map(([company, role, period, place], index) => <article key={company}><span>0{index + 1}</span><div><h2>{company}</h2><p>{role}</p></div><p>{period}<br />{place}</p></article>)}</div></section>
    <section id="about" className="about"><p className="mono">EDUCATION / SKILLS</p><div className="about-grid"><div><h2>Master of Science in Computer Science</h2><p>Auburn University at Montgomery<br />Jan 2024 — Dec 2025</p><h2>Bachelor of Technology in Electrical and Electronics Engineering</h2><p>National Institute of Technology Mizoram<br />Aug 2018 — May 2022</p></div><div><h3>Languages</h3><p>Python · Java · SQL · JavaScript</p><h3>AI / ML</h3><p>LLMs · RAG · Prompt Engineering · Guardrails · LangChain · Whisper · PyTorch · Scikit-learn · OpenCV</p><h3>Backend / Data</h3><p>FastAPI · Spring Boot · PostgreSQL · Redis · Kafka · RabbitMQ</p><h3>Cloud / DevOps</h3><p>AWS · GCP · Docker · Kubernetes · Jenkins · GitHub Actions</p></div></div></section>
    <footer id="contact"><span>YASWANTH SAI VENKATESAN</span><a href="mailto:yaswanthsai2120@gmail.com">yaswanthsai2120@gmail.com</a><span className="flags" aria-label="United States and India">🇺🇸&nbsp; 🇮🇳</span></footer>
  </main>;
};
import { useEffect, useRef, useState } from "react";
