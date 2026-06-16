'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

type Props = {
  sessionId: string
  messageIndex: number
}

export default function FeedbackWidget({ sessionId, messageIndex }: Props) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!rating || submitting) return
    const userId = localStorage.getItem('userId')
    if (!userId) return

    setSubmitting(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId, rating, comment: comment || undefined }),
      })
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mt-2 ml-6 text-[12px] text-an-fg-muted">
        Thanks for your feedback
      </div>
    )
  }

  return (
    <div className="mt-3 ml-6 an-fade-in" data-message-index={messageIndex}>
      <div className="flex items-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            className="transition-colors duration-100"
          >
            <Star
              size={16}
              className={
                i <= (hover || rating)
                  ? 'text-an-accent fill-an-accent'
                  : 'text-an-fg-muted'
              }
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-1 text-[12px] text-an-fg-muted">{rating}/5</span>
        )}
      </div>

      {rating > 0 && (
        <div className="flex flex-col gap-2 an-fade-in">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Optional comment…"
            rows={2}
            className="w-full max-w-xs px-3 py-2 bg-an-bg-surface border border-an-border rounded-md text-[13px] text-an-fg-base placeholder:text-an-fg-muted resize-none focus:outline-none focus:border-an-border-strong transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="self-start h-7 px-3 bg-an-accent hover:bg-an-accent-hover text-white text-[12px] font-medium rounded-md transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  )
}
