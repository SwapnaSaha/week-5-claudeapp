'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ChatArea from '@/components/ChatArea'
import RightPanel, { type ExecutionStep } from '@/components/RightPanel'
import type { SessionRow, MessageRow } from '@/lib/db'

const DEFAULT_STEPS: ExecutionStep[] = [
  { id: 'parse', label: 'Parsing document', status: 'pending' },
  { id: 'send', label: 'Sending to Azure AI', status: 'pending' },
  { id: 'wait', label: 'Waiting for response', status: 'pending' },
  { id: 'process', label: 'Processing response', status: 'pending' },
  { id: 'done', label: 'Completed', status: 'pending' },
]

export default function ChatPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter()
  const { sessionId } = params

  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [session, setSession] = useState<SessionRow | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [steps, setSteps] = useState<ExecutionStep[]>(DEFAULT_STEPS)
  const [blobUrl, setBlobUrl] = useState('')
  const [filename, setFilename] = useState('')
  const [fileType, setFileType] = useState('')

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) {
      router.push('/login')
      return
    }

    Promise.all([
      fetch(`/api/sessions?userId=${userId}`).then(r => r.json()),
      fetch(`/api/sessions/${sessionId}`).then(r => r.json()),
      fetch(`/api/messages?sessionId=${sessionId}`).then(r => r.json()),
      fetch('/api/auth/azure-status').then(r => r.json()),
    ]).then(([allSessions, sess, msgs, azureStatus]) => {
      if (Array.isArray(allSessions)) setSessions(allSessions)
      if (sess && !sess.error) setSession(sess)
      setMessages(Array.isArray(msgs) ? msgs : [])
      setIsConnected(azureStatus?.connected ?? false)
    }).finally(() => setLoading(false))
  }, [sessionId, router])

  const handleFileChange = useCallback((url: string, name: string, type: string) => {
    setBlobUrl(url)
    setFilename(name)
    setFileType(type)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-an-bg-base flex items-center justify-center">
        <span className="text-[13px] text-an-fg-muted">Loading…</span>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-an-bg-base flex items-center justify-center">
        <p className="text-[14px] text-an-fg-subtle">Session not found.</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-an-bg-base overflow-hidden">
      <Sidebar sessions={sessions} onSessionsChange={setSessions} />

      <main className="flex-1 overflow-hidden">
        <ChatArea
          session={session}
          initialMessages={messages}
          isConnected={isConnected}
          onStepsChange={setSteps}
          onFileChange={(url, name, type) => handleFileChange(url, name, type)}
        />
      </main>

      <RightPanel
        steps={steps}
        blobUrl={blobUrl || undefined}
        filename={filename || undefined}
        fileType={fileType || undefined}
      />
    </div>
  )
}
