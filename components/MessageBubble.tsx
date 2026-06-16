import FeedbackWidget from './FeedbackWidget'
import type { MessageRow } from '@/lib/db'

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

type Props = {
  message: MessageRow
  index: number
  sessionId: string
}

export default function MessageBubble({ message, index, sessionId }: Props) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <div className="bg-an-accent-subtle border border-[rgba(217,119,87,0.20)] rounded-[12px_12px_4px_12px] px-4 py-3">
            <p className="text-[14px] text-an-fg-base leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          <p className="text-[12px] text-an-fg-muted mt-1 text-right">
            {formatTime(message.created_at)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-2">
        <div className="w-4 h-4 rounded-full bg-an-accent shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[14px] text-an-fg-base leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
          <p className="text-[12px] text-an-fg-muted mt-1">
            {formatTime(message.created_at)}
          </p>
        </div>
      </div>
      <FeedbackWidget sessionId={sessionId} messageIndex={index} />
    </div>
  )
}
