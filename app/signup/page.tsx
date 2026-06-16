'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }

      localStorage.setItem('userId', data.id)
      localStorage.setItem('userEmail', data.email)
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      data-theme="light"
      className="min-h-screen flex items-center justify-center bg-an-bg-base px-4"
    >
      <div className="w-full max-w-[480px]">
        <div className="mb-8 text-center">
          <h1 className="font-display text-[28px] font-medium text-an-fg-base leading-tight mb-2">
            Create your account
          </h1>
          <p className="text-[14px] text-an-fg-subtle">
            Start analysing contracts with AI
          </p>
        </div>

        <div className="bg-an-bg-subtle border border-an-border rounded-lg p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-an-fg-subtle uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-9 px-3 rounded-md bg-an-bg-surface border border-an-border text-[14px] text-an-fg-base placeholder:text-an-fg-muted focus:outline-none focus:border-an-border-strong transition-colors duration-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-an-fg-subtle uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                className="h-9 px-3 rounded-md bg-an-bg-surface border border-an-border text-[14px] text-an-fg-base placeholder:text-an-fg-muted focus:outline-none focus:border-an-border-strong transition-colors duration-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-an-fg-subtle uppercase tracking-wide">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                required
                className="h-9 px-3 rounded-md bg-an-bg-surface border border-an-border text-[14px] text-an-fg-base placeholder:text-an-fg-muted focus:outline-none focus:border-an-border-strong transition-colors duration-100"
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-9 px-4 rounded-md bg-an-accent hover:bg-an-accent-hover text-white text-[14px] font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-an-fg-subtle mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-an-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
