'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Circle,
} from 'lucide-react'
import type { SessionRow } from '@/lib/db'

function StatusIcon({ status }: { status: SessionRow['status'] }) {
  if (status === 'processing') return <Loader2 size={14} className="text-an-fg-muted animate-spin" />
  if (status === 'completed') return <CheckCircle2 size={14} className="text-an-success" />
  if (status === 'error') return <AlertCircle size={14} className="text-an-error" />
  return <Circle size={14} className="text-an-fg-muted" />
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

type Props = {
  session: SessionRow
  isActive: boolean
  onSelect: (id: string) => void
  onUpdate: (id: string, fields: Partial<Pick<SessionRow, 'title' | 'pinned'>>) => void
  onDelete: (id: string) => void
}

export default function SessionItem({ session, isActive, onSelect, onUpdate, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(session.title)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) renameRef.current?.focus()
  }, [renaming])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleRenameSubmit() {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== session.title) {
      onUpdate(session.id, { title: trimmed })
    }
    setRenaming(false)
  }

  return (
    <div
      className={`group relative flex items-center gap-2 px-3 h-9 rounded-md cursor-pointer transition-colors duration-100 ${
        isActive
          ? 'bg-an-bg-elevated text-an-fg-base'
          : 'text-an-fg-subtle hover:bg-an-bg-surface hover:text-an-fg-base'
      }`}
      onClick={() => !renaming && onSelect(session.id)}
    >
      <StatusIcon status={session.status} />

      {renaming ? (
        <input
          ref={renameRef}
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={e => {
            if (e.key === 'Enter') handleRenameSubmit()
            if (e.key === 'Escape') setRenaming(false)
          }}
          onClick={e => e.stopPropagation()}
          className="flex-1 bg-an-bg-elevated text-an-fg-base text-[13px] outline-none border-b border-an-border-strong min-w-0"
        />
      ) : (
        <span className="flex-1 text-[13px] truncate">{session.title}</span>
      )}

      <span className="text-[12px] text-an-fg-muted shrink-0 group-hover:hidden">
        {formatDate(session.updated_at)}
      </span>

      <button
        onClick={e => {
          e.stopPropagation()
          setMenuOpen(v => !v)
        }}
        className="hidden group-hover:flex items-center justify-center w-6 h-6 rounded hover:bg-an-bg-elevated shrink-0"
      >
        <MoreHorizontal size={14} />
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-8 z-50 w-40 bg-an-bg-elevated border border-an-border rounded-md shadow-lg py-1 an-fade-in"
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full flex items-center gap-2 px-3 h-8 text-[13px] text-an-fg-base hover:bg-an-bg-surface transition-colors"
            onClick={() => {
              onUpdate(session.id, { pinned: !session.pinned })
              setMenuOpen(false)
            }}
          >
            {session.pinned ? <PinOff size={14} /> : <Pin size={14} />}
            {session.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 h-8 text-[13px] text-an-fg-base hover:bg-an-bg-surface transition-colors"
            onClick={() => {
              setRenaming(true)
              setRenameValue(session.title)
              setMenuOpen(false)
            }}
          >
            <Pencil size={14} />
            Rename
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 h-8 text-[13px] text-an-error hover:bg-an-bg-surface transition-colors"
            onClick={() => {
              setConfirmDelete(true)
              setMenuOpen(false)
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-an-bg-elevated border border-an-border rounded-lg p-6 w-80 an-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[14px] text-an-fg-base mb-1 font-medium">Delete this chat?</p>
            <p className="text-[13px] text-an-fg-subtle mb-5">
              All messages and feedback will be permanently removed.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="h-8 px-3 text-[13px] text-an-fg-base border border-an-border rounded-md hover:bg-an-bg-surface transition-colors"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button
                className="h-8 px-3 text-[13px] text-white bg-an-error rounded-md hover:opacity-90 transition-opacity"
                onClick={() => {
                  onDelete(session.id)
                  setConfirmDelete(false)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
