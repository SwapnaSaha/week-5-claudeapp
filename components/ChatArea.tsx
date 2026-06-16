'use client'

import { useState, useEffect, useCallback } from 'react'
import MessageList from './MessageList'
import Composer from './Composer'
import type { MessageRow, SessionRow } from '@/lib/db'
import type { ExecutionStep } from './RightPanel'

type Props = {
  session: SessionRow
  initialMessages: MessageRow[]
  isConnected: boolean
  onStepsChange: (steps: ExecutionStep[]) => void
  onFileChange: (blobUrl: string, filename: string, fileType: string) => void
}

function makeSteps(overrides: Partial<Record<string, ExecutionStep['status']>> = {}): ExecutionStep[] {
  const ids = ['parse', 'send', 'wait', 'process', 'done']
  const labels = [
    'Parsing document',
    'Sending to Azure AI',
    'Waiting for response',
    'Processing response',
    'Completed',
  ]
  return ids.map((id, i) => ({
    id,
    label: labels[i],
    status: overrides[id] ?? 'pending',
  }))
}

export default function ChatArea({
  session,
  initialMessages,
  isConnected,
  onStepsChange,
  onFileChange,
}: Props) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [contractText, setContractText] = useState('')
  const [contractName, setContractName] = useState('')
  const [blobUrl, setBlobUrl] = useState('')
  const [fileType, setFileType] = useState('')

  // Reset messages when session changes
  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages, session.id])

  function handleFileLoaded(text: string, name: string, url: string, type: string) {
    setContractText(text)
    setContractName(name)
    setBlobUrl(url)
    setFileType(type)
    onFileChange(url, name, type)
  }

  function handleFileCleared() {
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    setContractText('')
    setContractName('')
    setBlobUrl('')
    setFileType('')
    onFileChange('', '', '')
  }

  const handleSend = useCallback(async (text: string) => {
    if (isLoading) return
    setIsLoading(true)

    // Optimistic user message
    const optimistic: MessageRow = {
      id: `optimistic-${Date.now()}`,
      session_id: session.id,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    // Step 1: parse
    onStepsChange(makeSteps({ parse: 'active' }))
    await new Promise(r => setTimeout(r, 400))
    onStepsChange(makeSteps({ parse: 'completed', send: 'active' }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          userMessage: text,
          contractText,
        }),
      })

      onStepsChange(makeSteps({ parse: 'completed', send: 'completed', wait: 'active' }))

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Request failed')
      }

      onStepsChange(makeSteps({ parse: 'completed', send: 'completed', wait: 'completed', process: 'active' }))

      const data = await res.json()

      onStepsChange(makeSteps({
        parse: 'completed', send: 'completed', wait: 'completed', process: 'completed', done: 'completed',
      }))

      // Replace optimistic + add assistant response
      setMessages(prev => {
        const without = prev.filter(m => m.id !== optimistic.id)
        return [
          ...without,
          data.userMessage,
          data.assistantMessage,
        ]
      })

      // Auto-title on first exchange
      if (session.title === 'New session') {
        const title = text.slice(0, 55) + (text.length > 55 ? '…' : '')
        fetch(`/api/sessions/${session.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        })
      }
    } catch (err) {
      onStepsChange(makeSteps({
        parse: 'completed', send: 'completed', wait: 'error', process: 'pending', done: 'pending',
      }))
      const errorMsg: MessageRow = {
        id: `error-${Date.now()}`,
        session_id: session.id,
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev.filter(m => m.id !== optimistic.id), errorMsg])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, session.id, session.title, contractText, onStepsChange])

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} isLoading={isLoading} sessionId={session.id} />
      <Composer
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onFileLoaded={handleFileLoaded}
        onFileCleared={handleFileCleared}
        filename={contractName}
        isLoading={isLoading}
        isConnected={isConnected}
      />
    </div>
  )
}
