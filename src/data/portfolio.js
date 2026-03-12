export const portfolio = {
  name: "Yaswanth Sai Venkatesan",
  shortName: "Yaswanth",
  title: "Backend and Full-Stack Developer",
  location: "Montgomery, AL",
  email: "yaswanthsai2120@gmail.com",
  phone: "+1 (334) 851-1120",
  summary:
    "Developer focused on Spring Boot microservices, event-driven backend systems, and real-time machine learning pipelines across cloud and edge environments.",
  intro:
    "My recent work spans production REST APIs, Kafka- and RabbitMQ-based backend workflows, SQL optimization, Docker and Jenkins delivery pipelines, and research-grade computer vision systems built with PyTorch and YOLO.",
  education: [
    {
      school: "Auburn University at Montgomery",
      degree: "M.S. in Computer Science",
      period: "Jan 2024 – Dec 2025",
      location: "Montgomery, AL",
    },
    {
      school: "National Institute of Technology Mizoram",
      degree: "B.Tech in Electrical and Electronics Engineering",
      period: "Aug 2018 – May 2022",
      location: "India",
    },
  ],
  experience: [
    {
      role: "Graduate Research Assistant",
      company: "Auburn University at Montgomery",
      period: "Jan 2025 – Aug 2025",
      highlights: [
        "Built real-time object detection and inference pipelines using YOLOv5 and PyTorch across edge and cloud environments.",
        "Reduced inference latency by 35% through preprocessing optimization, smart data filtering, and benchmarking.",
        "Designed evaluation pipelines for distributed ML systems using precision-recall analysis and resource profiling.",
      ],
    },
    {
      role: "Associate IT Consultant",
      company: "ITC Infotech",
      period: "Jul 2022 – Nov 2023",
      highlights: [
        "Developed Java Spring Boot microservices and REST APIs for production backend services, reducing response latency by 30%.",
        "Implemented asynchronous service communication using Kafka and RabbitMQ to improve resilience across workflows.",
        "Optimized SQL queries and indexing strategies, improving database performance by 25% on high-traffic paths.",
        "Built CI/CD pipelines with Jenkins and Docker for reliable automated deployments.",
      ],
    },
  ],
  focusAreas: [
    {
      title: "Backend Architecture",
      description:
        "Spring Boot microservices, REST APIs, SQL performance work, and event-driven system design.",
    },
    {
      title: "Distributed Systems",
      description:
        "Kafka, RabbitMQ, Redis, Docker, Jenkins, and cloud-ready service workflows built for scale.",
    },
    {
      title: "Applied ML",
      description:
        "YOLO, PyTorch, and real-time inference pipelines for edge-cloud video analytics and recommendation systems.",
    },
  ],
  skills: [
    { name: "Java", category: "languages" },
    { name: "Python", category: "languages" },
    { name: "JavaScript", category: "languages" },
    { name: "C/C++", category: "languages" },
    { name: "Spring Boot", category: "frameworks" },
    { name: "Spring Cloud", category: "frameworks" },
    { name: "React", category: "frameworks" },
    { name: "Express.js", category: "frameworks" },
    { name: "TensorFlow", category: "frameworks" },
    { name: "PyTorch", category: "frameworks" },
    { name: "PostgreSQL", category: "databases" },
    { name: "MySQL", category: "databases" },
    { name: "MongoDB", category: "databases" },
    { name: "Redis", category: "databases" },
    { name: "Kafka", category: "infrastructure" },
    { name: "RabbitMQ", category: "infrastructure" },
    { name: "Docker", category: "infrastructure" },
    { name: "Kubernetes", category: "infrastructure" },
    { name: "AWS", category: "infrastructure" },
    { name: "Jenkins", category: "infrastructure" },
  ],
  projects: [
    {
      title: "Distributed Notification Platform",
      description:
        "Designed an event-driven notification platform using Java, Spring Boot, Kafka, Redis, and PostgreSQL, handling more than 1M simulated events per day with retry queues and fault-tolerant delivery.",
      image: "/project-notification.svg",
      tags: ["Java", "Spring Boot", "Kafka", "Redis", "PostgreSQL"],
    },
    {
      title: "Intelligent API Gateway",
      description:
        "Built a scalable API gateway with Spring Cloud Gateway, JWT authentication, Redis-backed rate limiting, circuit breakers, and request tracing for high-throughput microservice traffic.",
      image: "/project-gateway.svg",
      tags: ["Spring Cloud", "JWT", "Redis", "Microservices"],
    },
    {
      title: "Real-Time Recommendation Engine",
      description:
        "Integrated Python ML models with Java Spring Boot APIs and Kafka streaming to generate personalized recommendations with Redis caching for low-latency inference.",
      image: "/project-recommendation.svg",
      tags: ["Python", "Spring Boot", "Kafka", "Redis", "ML"],
    },
  ],
  links: {
    github: "https://github.com/Yaswanth2120",
    linkedin: "https://www.linkedin.com/in/yaswanth-sai-v-075a4816b/",
    resume: "/resume",
    resumeFile: "/Yaswanth_Resume.pdf",
  },
};
