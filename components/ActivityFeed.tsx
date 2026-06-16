import { MessageCircle, FolderOpen, CheckCircle2, AlertCircle } from 'lucide-react'

export type ActivityEvent = {
  id: string
  type: 'message_sent' | 'session_created' | 'session_completed' | 'session_error'
  label: string
  created_at: string
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const ICONS = {
  message_sent: MessageCircle,
  session_created: FolderOpen,
  session_completed: CheckCircle2,
  session_error: AlertCircle,
}

const COLORS = {
  message_sent: 'text-an-fg-muted',
  session_created: 'text-an-accent',
  session_completed: 'text-an-success',
  session_error: 'text-an-error',
}

type Props = { events: ActivityEvent[] }

export default function ActivityFeed({ events }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-[13px] text-an-fg-muted text-center py-8">
        No recent activity
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {events.map(ev => {
        const Icon = ICONS[ev.type]
        return (
          <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-an-border last:border-0">
            <Icon size={14} className={COLORS[ev.type]} />
            <span className="flex-1 text-[13px] text-an-fg-base">{ev.label}</span>
            <span className="text-[12px] text-an-fg-muted shrink-0">{relativeTime(ev.created_at)}</span>
          </div>
        )
      })}
    </div>
  )
}
