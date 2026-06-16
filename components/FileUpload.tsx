'use client'

import { useRef, useState } from 'react'
import { Paperclip, X } from 'lucide-react'

type Props = {
  onFileLoaded: (text: string, name: string, blobUrl: string, fileType: string) => void
  onFileCleared: () => void
  filename?: string
  disabled?: boolean
}

const MAX_BYTES = 10 * 1024 * 1024

export default function FileUpload({ onFileLoaded, onFileCleared, filename, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [parsing, setParsing] = useState(false)

  async function handleFile(file: File) {
    setError('')

    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      setError('Only PDF and DOCX files are supported.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('File exceeds the 10 MB limit.')
      return
    }

    setParsing(true)
    try {
      const blobUrl = URL.createObjectURL(file)
      const arrayBuffer = await file.arrayBuffer()

      if (file.type === 'application/pdf') {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
        GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        const pdf = await getDocument({ data: arrayBuffer }).promise
        const pages: string[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
        }
        const text = pages.join('\n\n').trim()
        if (!text) {
          setError('No text found in this PDF. Scanned documents are not supported.')
          URL.revokeObjectURL(blobUrl)
          return
        }
        onFileLoaded(text, file.name, blobUrl, file.type)
      } else {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ arrayBuffer })
        onFileLoaded(result.value.trim(), file.name, blobUrl, file.type)
      }
    } catch {
      setError('Failed to parse the file. Please try again.')
    } finally {
      setParsing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {filename ? (
        <div className="flex items-center gap-1.5 h-7 px-2 bg-an-accent-subtle border border-an-accent rounded-full w-fit">
          <span className="text-[12px] text-an-accent max-w-[180px] truncate">{filename}</span>
          <button
            onClick={() => {
              onFileCleared()
              setError('')
            }}
            className="text-an-accent hover:opacity-70 transition-opacity"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || parsing}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1 text-an-fg-muted hover:text-an-fg-base transition-colors disabled:opacity-40"
          title="Attach a PDF or DOCX file"
        >
          <Paperclip size={16} className={parsing ? 'animate-pulse' : ''} />
          {parsing && <span className="text-[12px]">Parsing…</span>}
        </button>
      )}

      {error && (
        <p className="text-[12px] text-an-error">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
