'use client'

import { useRef, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import FileUpload from './FileUpload'

type Props = {
  onSend: (text: string) => void
  onFileLoaded: (text: string, name: string, blobUrl: string, fileType: string) => void
  onFileCleared: () => void
  filename?: string
  isLoading: boolean
  isConnected: boolean
  value: string
  onChange: (v: string) => void
}

export default function Composer({
  onSend,
  onFileLoaded,
  onFileCleared,
  filename,
  isLoading,
  isConnected,
  value,
  onChange,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || isLoading || !isConnected) return
    onSend(trimmed)
    onChange('')
  }

  const canSend = value.trim().length > 0 && !isLoading && isConnected

  return (
    <div className="px-4 pb-6">
      <div className="max-w-[680px] mx-auto">
        <div className="bg-an-bg-surface border border-an-border rounded-xl px-4 py-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about the contract…"
            disabled={isLoading}
            rows={1}
            className="w-full bg-transparent text-[14px] text-an-fg-base placeholder:text-an-fg-muted resize-none focus:outline-none leading-relaxed disabled:opacity-50"
          />

          <div className="flex items-end justify-between mt-2">
            <FileUpload
              onFileLoaded={onFileLoaded}
              onFileCleared={onFileCleared}
              filename={filename}
              disabled={isLoading}
            />

            <button
              onClick={submit}
              disabled={!canSend}
              className="w-8 h-8 rounded-full bg-an-accent flex items-center justify-center transition-colors duration-150 hover:bg-an-accent-hover disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              title="Send"
            >
              <ArrowUp size={16} className="text-white" />
            </button>
          </div>
        </div>

        <p className="text-center text-[12px] text-an-fg-muted mt-2">
          AI-generated analysis only. Always consult a qualified professional.
        </p>
      </div>
    </div>
  )
}
