import { NextResponse } from 'next/server'

export async function GET() {
  const connected = !!(process.env.AZURE_API_KEY && process.env.AZURE_OPENAI_ENDPOINT)
  return NextResponse.json({ connected })
}
