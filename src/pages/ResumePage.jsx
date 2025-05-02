import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

function ResumePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20">
      <div className="container mx-auto px-4">
        <Link
          to="/"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Page
        </Link>
        <div className="w-full bg-[#1A1A1A] rounded-lg p-4 shadow-lg">
        <iframe
        src="/Yaswanth_Resume.pdf"
        width="100%"
        height="800px"
        style={{ border: "none" }}
        title="Resume"
      />

      <a
        href="/Yaswanth_Resume.pdf"
        download
        className="text-blue-500 hover:underline mt-4 inline-block"
      >
        Download Resume
      </a>

        </div>
      </div>
    </div>
  )
}

export default ResumePage;
