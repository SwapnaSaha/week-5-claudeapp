import { NextRequest, NextResponse } from 'next/server'
import { getMessages } from '@/lib/db'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '100')
  const before = req.nextUrl.searchParams.get('before') ?? undefined

  if (!sessionId) return NextResponse.json({ error: 'sessionId required.' }, { status: 400 })

  try {
    const messages = await getMessages(sessionId, limit, before)
    return NextResponse.json(messages)
  } catch {
    return NextResponse.json({ error: 'Failed to load messages.' }, { status: 500 })
  }
}
