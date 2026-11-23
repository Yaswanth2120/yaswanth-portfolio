// All site copy lives here. The 3D scene expects 3 live projects (one office
// zone each), 4 finished projects and 3 experience items (JOBS in choreography.js): the scroll timeline in
// src/scene/choreography.js has one stop per finished project and per job.

const EMAIL = "yaswanthsai2120@gmail.com";
const GITHUB = "https://github.com/Yaswanth2120";

export const content = {
  header: {
    logo: "YSV.",
    nav: [
      { label: "Projects", href: "#projects" },
      { label: "Experience", href: "#experience" },
      { label: "Contact", href: "#contact" },
    ],
    email: EMAIL,
  },

  intro: {
    name: "Yaswanth Sai Venkatesan",
    role: "AI ENGINEER",
    scrollHint: "Scroll",
  },

  // What's being built right now. The home-screen office has three zones (a wall
  // screen + six agents each); the projects rotate across the screens so each
  // gets the centre. Clicking an agent shows the feature it's on for its zone's
  // current project; clicking it again moves to the next one.
  liveProjects: [
    {
      name: "AgentReplay",
      area: "Agent reliability",
      status: "Built · v0.1.0",
      features: [
        { title: "Record & replay", detail: "Records every LLM request and tool result, then replays the run offline, with no GPU needed." },
        { title: "Regression catch", detail: "Strict and lenient matching. A replay miss means the agent's behaviour changed, and CI fails." },
        { title: "Fault injection", detail: "Injects timeouts, bad tool results and malformed responses to test how agents recover." },
        { title: "Failure detectors", detail: "Detectors for loops, stalls and bad tool use, with measured precision and recall." },
        { title: "200-task evaluation", detail: "A 200-task benchmark run live on vLLM with Qwen3-8B, then replayed deterministically." },
        { title: "CI integration", detail: "Replays run in GitHub Actions on every pull request to catch regressions before merge." },
      ],
      tech: ["Python", "FastAPI", "httpx", "Pydantic", "SQLite", "pytest", "vLLM"],
    },
    {
      name: "InferencePilot",
      area: "LLM serving optimization",
      status: "Next up",
      features: [
        { title: "Config sweeps", detail: "Benchmarks vLLM settings automatically: quantization, prefix caching, batch and scheduler options." },
        { title: "Statistics engine", detail: "A regression detector validated for false positives and statistical power, not just averages." },
        { title: "Quality gates", detail: "Checks quantized models on gsm8k with lm-evaluation-harness before they can win." },
        { title: "Recommendations", detail: "Recommends the best configuration it actually tested, never an extrapolated one." },
        { title: "Offline harness", detail: "A fake vLLM server keeps tests offline; live runs use an A100 with Qwen3-8B." },
        { title: "Big-model runs", detail: "Optional sweeps on GPT-OSS-120B to see which settings still hold at scale." },
      ],
      tech: ["Python", "vLLM", "lm-eval-harness", "SQLite", "Pydantic", "matplotlib"],
    },
    {
      name: "KernelForge",
      area: "GPU kernels",
      status: "Queued",
      features: [
        { title: "Fused softmax", detail: "A Triton kernel targeting 80% of measured copy bandwidth on an A100." },
        { title: "LayerNorm", detail: "A fused LayerNorm kernel held to the same 80% copy-bandwidth bar." },
        { title: "Causal attention", detail: "A forward-pass attention kernel aiming for 50% of the PyTorch SDPA baseline." },
        { title: "Frozen criteria", detail: "Pass/fail targets are fixed before the first benchmark, so no moving goalposts." },
        { title: "Correctness tests", detail: "Every kernel is checked against PyTorch across shapes and dtypes with pytest." },
        { title: "Profiling report", detail: "torch.profiler and Nsight Compute traces in a final A100 (SM80) performance report." },
      ],
      tech: ["Triton", "PyTorch", "pytest", "torch.profiler", "Nsight Compute"],
    },
  ],

  projects: {
    eyebrow: "Projects",
    linkLabel: "View on GitHub",
    items: [
      {
        name: "Veya AI",
        badge: "649 automated tests",
        summary:
          "Whisper transcription, document RAG, and Ollama LLM inference — grounded response generation with voice activity detection and JSONL IPC, all running locally.",
        stack: ["SwiftUI", "Python", "Whisper", "Ollama", "VAD"],
        github: `${GITHUB}/Veya`,
      },
      {
        name: "Intelligent API Gateway",
        summary:
          "A distributed API gateway with JWT authentication, Redis rate limiting, circuit breakers, request tracing, and React-based monitoring.",
        stack: ["Java", "Spring Cloud Gateway", "Redis", "React"],
        github: `${GITHUB}/Intelligent-API-Gateway`,
      },
      {
        name: "DocuIntel AI",
        summary:
          "A multi-user RAG platform — document ingestion, embeddings, vector retrieval, contextual prompt construction, grounded generation, and access isolation.",
        stack: ["FastAPI", "LangChain", "OpenAI", "ChromaDB", "Supabase"],
        github: `${GITHUB}/DocuIntel-AI`,
      },
      {
        name: "DeployGuard AI",
        summary:
          "A deployment intelligence platform that asynchronously compares software releases and generates regression and deployment-risk signals.",
        stack: ["FastAPI", "Spring Boot", "RabbitMQ", "PostgreSQL", "Next.js"],
        github: `${GITHUB}/deployguard-ai`,
      },
    ],
  },

  experience: {
    eyebrow: "Experience",
    items: [
      {
        org: "ITC Infotech",
        role: "Software Developer",
        period: "Jul 2022 — Nov 2023",
        place: "Kolkata, India",
        summary:
          "Spring Boot microservices and REST APIs, Kafka and RabbitMQ messaging, SQL tuning, and Jenkins + Docker delivery pipelines.",
      },
      {
        org: "Auburn University",
        role: "Graduate Research Assistant",
        period: "Jan 2025 — Aug 2025",
        place: "Montgomery, AL",
        summary:
          "Real-time object detection pipelines with YOLOv5 and PyTorch across edge and cloud, cutting inference latency by 35%.",
      },
      {
        org: "Agile Technologies",
        role: "Software Engineer",
        period: "Mar 2026 — Present",
        place: "Virginia, US",
      },
    ],
  },

  education: [
    {
      degree: "M.S. Computer Science",
      school: "Auburn University at Montgomery",
      period: "Jan 2024 — Dec 2025",
    },
    {
      degree: "B.Tech Electrical & Electronics Engineering",
      school: "National Institute of Technology Mizoram",
      period: "Aug 2018 — May 2022",
    },
  ],

  // Text drawn onto the in-scene screens.
  scene: {
    backend: [
      `@app.get("/users/{id}")`,
      `async def get_user(id: int):`,
      `    user = await db.fetch(id)`,
      `    cache.set(id, user, ttl=60)`,
      `    return UserOut(**user)`,
      ``,
      `@app.post("/events")`,
      `async def publish(e: Event):`,
      `    await kafka.send("events", e)`,
    ],
    frontend: { url: "app.local/dashboard" },
    devops: { steps: ["build", "test", "scan", "deploy", "live"], log: "pipeline #482 · main" },
    qa: {
      title: "TEST RUN",
      checks: ["login flow", "checkout api", "rate limits", "file upload", "dark paths", "a11y audit"],
    },
    ml: { title: "training · loss", epoch: "epoch" },
    ai: {
      user: "Summarise this contract",
      bot: "Three key clauses: payment in 30 days, auto-renewal, and a 60-day exit window.",
      input: "Ask anything…",
    },
    designer: { title: "Onboarding v3" },
    whiteboardLabel: "PROJECT",
    milestoneLabel: "MILESTONE",
  },

  contact: {
    eyebrow: "Contact",
    heading: "Every frustration is a tool waiting to be built.",
    email: EMAIL,
    links: [
      { label: "Email", href: `mailto:${EMAIL}`, primary: true },
      { label: "GitHub", href: GITHUB },
      { label: "Resume", href: "/resume" },
    ],
    footer: "© 2026 Yaswanth Sai Venkatesan",
  },
};
