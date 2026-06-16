'use client'

import { useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, Search, LogOut, FileText } from 'lucide-react'
import SessionItem from './SessionItem'
import type { SessionRow } from '@/lib/db'

const FILTERS = ['All', 'Pinned', 'Recent', 'Processing', 'Completed', 'Error'] as const
type Filter = typeof FILTERS[number]

type Props = {
  sessions: SessionRow[]
  onSessionsChange: (sessions: SessionRow[]) => void
}

export default function Sidebar({ sessions, onSessionsChange }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [creating, setCreating] = useState(false)

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') ?? '' : ''
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') ?? '' : ''

  const activeSessionId = pathname.startsWith('/chat/') ? pathname.split('/chat/')[1] : null

  const filtered = useMemo(() => {
    let list = sessions
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.title.toLowerCase().includes(q))
    }
    if (filter === 'Pinned') list = list.filter(s => s.pinned)
    else if (filter === 'Recent') {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
      list = list.filter(s => new Date(s.updated_at).getTime() > cutoff)
    } else if (filter === 'Processing') list = list.filter(s => s.status === 'processing')
    else if (filter === 'Completed') list = list.filter(s => s.status === 'completed')
    else if (filter === 'Error') list = list.filter(s => s.status === 'error')
    return list
  }, [sessions, search, filter])

  const pinned = filtered.filter(s => s.pinned)
  const unpinned = filtered.filter(s => !s.pinned)

  async function handleNewChat() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (res.ok) {
        onSessionsChange([data, ...sessions])
        router.push(`/chat/${data.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleUpdate(id: string, fields: Partial<Pick<SessionRow, 'title' | 'pinned'>>) {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (res.ok) {
      const updated = await res.json()
      onSessionsChange(
        sessions
          .map(s => (s.id === id ? updated : s))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          })
      )
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    onSessionsChange(sessions.filter(s => s.id !== id))
    if (activeSessionId === id) router.push('/dashboard')
  }

  function handleLogout() {
    localStorage.removeItem('userId')
    localStorage.removeItem('userEmail')
    fetch('/api/auth/logout', { method: 'GET' }).finally(() => {
      router.push('/login')
    })
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-screen bg-an-bg-subtle border-r border-an-border">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-an-border shrink-0">
        <FileText size={18} className="text-an-accent" />
        <span className="text-[14px] font-medium text-an-fg-base">ContractAI</span>
      </div>

      {/* New Chat */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <button
          onClick={handleNewChat}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-md bg-an-accent hover:bg-an-accent-hover text-white text-[14px] font-medium transition-colors duration-150 disabled:opacity-50"
        >
          <Plus size={16} />
          New chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-an-fg-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats"
            className="w-full h-8 pl-8 pr-3 bg-an-bg-surface border border-an-border rounded-md text-[13px] text-an-fg-base placeholder:text-an-fg-muted focus:outline-none focus:border-an-border-strong transition-colors"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-3 pb-2 flex gap-1 flex-wrap shrink-0">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-6 px-2 rounded-full text-[11px] font-medium uppercase tracking-wide transition-colors duration-100 ${
              filter === f
                ? 'bg-an-accent-subtle text-an-accent'
                : 'bg-an-bg-surface text-an-fg-muted hover:text-an-fg-subtle'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-0.5">
        {pinned.length > 0 && (
          <>
            <p className="text-[11px] uppercase tracking-wide text-an-fg-muted px-2 pt-2 pb-1">
              Pinned
            </p>
            {pinned.map(s => (
              <SessionItem
                key={s.id}
                session={s}
                isActive={s.id === activeSessionId}
                onSelect={id => router.push(`/chat/${id}`)}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
            {unpinned.length > 0 && (
              <p className="text-[11px] uppercase tracking-wide text-an-fg-muted px-2 pt-3 pb-1">
                Chats
              </p>
            )}
          </>
        )}

        {unpinned.map(s => (
          <SessionItem
            key={s.id}
            session={s}
            isActive={s.id === activeSessionId}
            onSelect={id => router.push(`/chat/${id}`)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}

        {filtered.length === 0 && (
          <p className="text-[13px] text-an-fg-muted text-center py-8">
            {search ? 'No results' : 'No chats yet'}
          </p>
        )}
      </div>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-an-border flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-full bg-an-accent-subtle flex items-center justify-center shrink-0">
          <span className="text-[12px] font-medium text-an-accent">
            {userEmail ? userEmail[0].toUpperCase() : '?'}
          </span>
        </div>
        <span className="flex-1 text-[13px] text-an-fg-subtle truncate">{userEmail}</span>
        <button
          onClick={handleLogout}
          className="text-an-fg-muted hover:text-an-fg-base transition-colors"
          title="Log out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
