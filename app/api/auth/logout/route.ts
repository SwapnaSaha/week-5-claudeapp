import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  cookies().delete('azure_token')
  return NextResponse.json({ ok: true })
}
