'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import RightPanel from '@/components/RightPanel'
import type { SessionRow } from '@/lib/db'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) {
      router.push('/login')
      return
    }

    fetch(`/api/sessions?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSessions(data)
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-an-bg-base flex items-center justify-center">
        <span className="text-[13px] text-an-fg-muted">Loading…</span>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-an-bg-base overflow-hidden">
      <Sidebar sessions={sessions} onSessionsChange={setSessions} />
      <main className="flex-1 overflow-hidden">{children}</main>
      <RightPanel />
    </div>
  )
}
