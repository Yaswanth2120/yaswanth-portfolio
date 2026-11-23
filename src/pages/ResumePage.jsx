import { Link } from "react-router-dom";

const RESUME_FILE = "/Yaswanth_Resume.pdf";

function ResumePage() {
  return (
    <div className="min-h-screen bg-background px-5 pb-12 pt-10 text-foreground md:px-12">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="label-mono link-line">
            ← Back to portfolio
          </Link>
          <a href={RESUME_FILE} download className="btn-key">
            Download
          </a>
        </div>
        <iframe src={RESUME_FILE} title="Resume" className="h-[85vh] w-full border border-border bg-background" />
      </div>
    </div>
  );
}

export default ResumePage;
