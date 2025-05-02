import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

function ResumePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20">
      <div className="container mx-auto px-4">
        <Link
          to="/#contact"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Contact
        </Link>
        <div className="w-full bg-[#1A1A1A] rounded-lg p-4 shadow-lg">
        <iframe
          src="/Yaswanth_Resume.pdf"
          className="w-full h-[800px] md:h-[1000px]"
          style={{ border: "none" }}
          title="Resume Viewer"
        />
        <a
          href="/resume.pdf"
          download
          className="mt-4 inline-block text-blue-500 hover:underline"
        >Download Resume
      </a>
      

        </div>
      </div>
    </div>
  )
}

export default ResumePage;
