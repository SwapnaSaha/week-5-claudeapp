import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUser } from '@/lib/db'

const GENERIC_ERROR = 'Invalid email or password.'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
    }

    const user = await getUser(email)
    if (!user) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
    }

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
    }

    return NextResponse.json({ id: user.id, email: user.email })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
