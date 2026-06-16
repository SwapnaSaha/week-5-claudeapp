import Link from 'next/link'
import { FileSearch, History, Eye } from 'lucide-react'

export default function LandingPage() {
  return (
    <div data-theme="light" className="min-h-screen bg-an-bg-base">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-an-border">
        <div className="flex items-center gap-2">
          <FileSearch size={20} className="text-an-accent" />
          <span className="font-display text-[16px] font-medium text-an-fg-base">ContractAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="h-9 px-4 rounded-md border border-an-border text-[14px] text-an-fg-base hover:bg-an-bg-subtle transition-colors duration-150 flex items-center"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="h-9 px-4 rounded-md bg-an-accent hover:bg-an-accent-hover text-white text-[14px] font-medium transition-colors duration-150 flex items-center"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-8 py-24 text-center max-w-3xl mx-auto">
        <h1 className="font-display text-[48px] font-medium text-an-fg-base leading-[1.15] mb-6">
          Understand any contract<br />in minutes
        </h1>
        <p className="text-[18px] text-an-fg-subtle leading-relaxed mb-10 max-w-xl mx-auto">
          Upload a PDF or DOCX contract, ask questions in plain language, and get precise answers grounded in the document — powered by Azure AI.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="h-11 px-6 rounded-md bg-an-accent hover:bg-an-accent-hover text-white text-[15px] font-medium transition-colors duration-150 flex items-center"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="h-11 px-6 rounded-md border border-an-border text-[15px] text-an-fg-base hover:bg-an-bg-subtle transition-colors duration-150 flex items-center"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 pb-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-an-bg-surface border border-an-border rounded-lg p-6">
            <FileSearch size={24} className="text-an-accent mb-4" />
            <h3 className="text-[15px] font-medium text-an-fg-base mb-2">AI contract analysis</h3>
            <p className="text-[13px] text-an-fg-subtle leading-relaxed">
              Ask any question about your contract and receive answers with specific section references — no copy-paste required.
            </p>
          </div>

          <div className="bg-an-bg-surface border border-an-border rounded-lg p-6">
            <History size={24} className="text-an-accent mb-4" />
            <h3 className="text-[15px] font-medium text-an-fg-base mb-2">Persistent session history</h3>
            <p className="text-[13px] text-an-fg-subtle leading-relaxed">
              Every conversation is saved. Return to any session to continue where you left off, with full message history.
            </p>
          </div>

          <div className="bg-an-bg-surface border border-an-border rounded-lg p-6">
            <Eye size={24} className="text-an-accent mb-4" />
            <h3 className="text-[15px] font-medium text-an-fg-base mb-2">Document preview</h3>
            <p className="text-[13px] text-an-fg-subtle leading-relaxed">
              View your contract alongside the chat. Track every step of the AI's analysis in the execution panel.
            </p>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <footer className="border-t border-an-border px-8 py-6 text-center">
        <p className="text-[12px] text-an-fg-muted italic">
          AI-generated analysis only. Always consult a qualified professional before acting on the findings.
        </p>
      </footer>
    </div>
  )
}
