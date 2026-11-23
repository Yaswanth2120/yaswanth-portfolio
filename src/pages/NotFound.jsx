import { Link } from "react-router-dom";

export const NotFound = () => (
  <main className="flex min-h-svh flex-col items-start justify-end gap-6 bg-background px-5 pb-[10vh] text-foreground md:px-12">
    <p className="label-mono text-primary/70">404</p>
    <h1 className="font-serif text-[clamp(3rem,8vw,8rem)] font-light leading-[0.9]">Nobody works here.</h1>
    <Link to="/" className="btn-line">
      Back to the office
    </Link>
  </main>
);
