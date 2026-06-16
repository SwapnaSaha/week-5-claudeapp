'use client'

import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import MessageBubble from './MessageBubble'
import type { MessageRow } from '@/lib/db'

type Props = {
  messages: MessageRow[]
  isLoading: boolean
  sessionId: string
}

export default function MessageList({ messages, isLoading, sessionId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-[18px] font-medium text-an-fg-base">
          Start your contract analysis
        </p>
        <p className="text-[14px] text-an-fg-subtle max-w-sm">
          Upload a PDF or DOCX contract, then ask any question about it.
        </p>
        <p className="text-[12px] text-an-fg-muted italic mt-2">
          AI-generated analysis only. Always consult a qualified professional.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto py-6 px-4">
      <div className="max-w-[680px] mx-auto flex flex-col gap-6">
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id} message={msg} index={i} sessionId={sessionId} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 an-fade-in">
            <div className="w-4 h-4 rounded-full bg-an-accent shrink-0" />
            <Loader2 size={16} className="text-an-fg-muted animate-spin" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
