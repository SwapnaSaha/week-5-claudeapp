import { NextRequest, NextResponse } from 'next/server'
import { createSession, getSessions } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required.' }, { status: 400 })
    const session = await createSession(userId)
    return NextResponse.json(session, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create session.' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required.' }, { status: 400 })
    const sessions = await getSessions(userId)
    return NextResponse.json(sessions)
  } catch {
    return NextResponse.json({ error: 'Failed to load sessions.' }, { status: 500 })
  }
}
