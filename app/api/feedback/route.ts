import { NextRequest, NextResponse } from 'next/server'
import { createFeedback } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId, rating, comment } = await req.json()

    if (!sessionId || !userId || !rating) {
      return NextResponse.json({ error: 'sessionId, userId, and rating are required.' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 })
    }

    const feedback = await createFeedback(userId, sessionId, rating, comment)
    return NextResponse.json(feedback, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save feedback.' }, { status: 500 })
  }
}
