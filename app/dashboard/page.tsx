'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import KpiCard from '@/components/KpiCard'
import ActivityFeed, { type ActivityEvent } from '@/components/ActivityFeed'

type KpiData = {
  totalSessions: number
  sessionsToday: number
  totalMessages: number
  messagesThisWeek: number
  activeSessions: number
  pinnedSessions: number
  avgRating: string
  failedSessions: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [kpi, setKpi] = useState<KpiData | null>(null)
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    fetch(`/api/dashboard?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        setKpi(data.kpi)
        setEvents(data.events ?? [])
      })
      .catch(() => {})
  }, [])

  async function handleNewChat() {
    const userId = localStorage.getItem('userId')
    if (!userId || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (res.ok) router.push(`/chat/${data.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[18px] font-medium text-an-fg-base">Dashboard</h1>
          <p className="text-[13px] text-an-fg-subtle mt-0.5">Overview of your contract analysis activity</p>
        </div>
        <button
          onClick={handleNewChat}
          disabled={creating}
          className="flex items-center gap-2 h-9 px-4 bg-an-accent hover:bg-an-accent-hover text-white text-[14px] font-medium rounded-md transition-colors duration-150 disabled:opacity-50"
        >
          <Plus size={16} />
          New chat
        </button>
      </div>

      {/* Azure connect banner */}
      <AzureBanner />

      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <KpiCard label="Total chat sessions" value={kpi?.totalSessions ?? '—'} />
        <KpiCard label="Sessions today" value={kpi?.sessionsToday ?? '—'} />
        <KpiCard label="Total AI queries" value={kpi?.totalMessages ?? '—'} />
        <KpiCard label="Queries this week" value={kpi?.messagesThisWeek ?? '—'} />
        <KpiCard label="Active sessions (7d)" value={kpi?.activeSessions ?? '—'} />
        <KpiCard label="Pinned chats" value={kpi?.pinnedSessions ?? '—'} />
        <KpiCard label="Avg feedback rating" value={kpi?.avgRating ?? '—'} sub="out of 5.0" />
        <KpiCard label="Failed sessions" value={kpi?.failedSessions ?? '—'} />
      </div>

      {/* Activity feed */}
      <div>
        <h2 className="text-[14px] font-medium text-an-fg-base mb-4">Recent activity</h2>
        <ActivityFeed events={events} />
      </div>
    </div>
  )
}

function AzureBanner() {
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/auth/azure-status')
      .then(r => r.json())
      .then(d => setConnected(d.connected))
      .catch(() => setConnected(false))
  }, [])

  if (connected !== false) return null

  return (
    <div className="flex items-center justify-between bg-an-accent-subtle border border-an-accent rounded-md px-4 py-3 mb-6">
      <p className="text-[13px] text-an-fg-base">
        Connect your Microsoft account to start using AI analysis.
      </p>
      <a
        href="/api/auth/microsoft"
        className="h-8 px-3 rounded-md bg-an-accent text-white text-[13px] font-medium flex items-center hover:bg-an-accent-hover transition-colors"
      >
        Connect with Microsoft
      </a>
    </div>
  )
}
