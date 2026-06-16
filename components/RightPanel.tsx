'use client'

import { CheckCircle2, Loader2, AlertCircle, Circle, FileText } from 'lucide-react'

export type StepStatus = 'pending' | 'active' | 'completed' | 'error'

export type ExecutionStep = {
  id: string
  label: string
  status: StepStatus
}

const DEFAULT_STEPS: ExecutionStep[] = [
  { id: 'parse', label: 'Parsing document', status: 'pending' },
  { id: 'send', label: 'Sending to Azure AI', status: 'pending' },
  { id: 'wait', label: 'Waiting for response', status: 'pending' },
  { id: 'process', label: 'Processing response', status: 'pending' },
  { id: 'done', label: 'Completed', status: 'pending' },
]

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'active') return <Loader2 size={14} className="text-an-accent animate-spin" />
  if (status === 'completed') return <CheckCircle2 size={14} className="text-an-success" />
  if (status === 'error') return <AlertCircle size={14} className="text-an-error" />
  return <Circle size={14} className="text-an-fg-muted" />
}

type Props = {
  steps?: ExecutionStep[]
  blobUrl?: string
  filename?: string
  fileType?: string
}

export default function RightPanel({ steps = DEFAULT_STEPS, blobUrl, filename, fileType }: Props) {
  return (
    <aside className="w-[304px] flex-shrink-0 flex flex-col h-screen bg-an-bg-subtle border-l border-an-border overflow-hidden">
      {/* Execution steps */}
      <div className="p-5 border-b border-an-border">
        <p className="text-[12px] uppercase tracking-wide text-an-fg-muted mb-3">Execution steps</p>
        <div className="flex flex-col gap-2">
          {steps.map(step => (
            <div key={step.id} className="flex items-center gap-2.5">
              <StepIcon status={step.status} />
              <span
                className={`text-[13px] ${
                  step.status === 'completed'
                    ? 'text-an-fg-subtle'
                    : step.status === 'active'
                    ? 'text-an-fg-base'
                    : step.status === 'error'
                    ? 'text-an-error'
                    : 'text-an-fg-muted'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Document preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {blobUrl && filename ? (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-an-border shrink-0">
              <FileText size={14} className="text-an-fg-muted" />
              <span className="text-[13px] text-an-fg-subtle truncate">{filename}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              {fileType === 'application/pdf' ? (
                <iframe
                  src={blobUrl}
                  className="w-full h-full border-0"
                  title={filename}
                />
              ) : (
                <div className="h-full overflow-y-auto p-4">
                  <p className="text-[12px] uppercase tracking-wide text-an-fg-muted mb-2">
                    Document text
                  </p>
                  <pre className="text-[13px] font-mono text-an-fg-subtle whitespace-pre-wrap leading-relaxed">
                    {/* DOCX text is injected by ChatArea via a different mechanism */}
                    Preview available after document upload
                  </pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <FileText size={32} className="text-an-fg-muted mx-auto mb-3" />
              <p className="text-[13px] text-an-fg-muted">
                Upload a document to see a preview here
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
