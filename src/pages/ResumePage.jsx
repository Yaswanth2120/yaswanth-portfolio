import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { portfolio } from "@/data/portfolio";

function ResumePage() {
  return (
    <div className="min-h-screen bg-background pt-24 text-foreground">
      <div className="container mx-auto px-4">
        <Link
          to="/"
          className="mb-6 inline-flex items-center text-primary transition-colors hover:text-primary/80"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Portfolio
        </Link>
        <div className="w-full rounded-[28px] border border-border/70 bg-card/80 p-4 shadow-[0_28px_80px_-46px_rgba(15,23,42,0.7)]">
          <iframe
            src={portfolio.links.resumeFile}
            width="100%"
            height="900px"
            style={{ border: "none" }}
            title="Resume"
            className="rounded-2xl bg-background"
          />

          <a
            href={portfolio.links.resumeFile}
            download
            className="mt-4 inline-block text-primary hover:underline"
          >
            Download Resume
          </a>
        </div>
      </div>
    </div>
  )
}

export default ResumePage;
