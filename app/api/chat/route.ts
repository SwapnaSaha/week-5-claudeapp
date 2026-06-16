import { NextRequest, NextResponse } from 'next/server'
import { createMessage, updateSession } from '@/lib/db'
import { getAzureClient } from '@/lib/azure'

const FALLBACK = 'I was unable to get a response from the AI. Please try again.'

export async function POST(req: NextRequest) {
  let sessionId: string
  let userMessage: string
  let contractText: string

  try {
    const body = await req.json()
    sessionId = body.sessionId
    userMessage = body.userMessage
    contractText = body.contractText ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!sessionId || !userMessage) {
    return NextResponse.json({ error: 'sessionId and userMessage are required.' }, { status: 400 })
  }

  const deploymentName = process.env.AZURE_DEPLOYMENT_NAME
  if (!deploymentName) {
    return NextResponse.json({ error: 'Azure deployment not configured.' }, { status: 500 })
  }

  try {
    await updateSession(sessionId, { status: 'processing' })

    const openai = getAzureClient()

    const combinedInput = contractText
      ? `CONTRACT TEXT:\n${contractText}\n\nUSER QUESTION:\n${userMessage}`
      : userMessage

    const response = await openai.chat.completions.create({
      model: deploymentName,
      messages: [
        {
          role: 'system',
          content:
            'You are a legal contract analysis assistant. Answer questions about contracts clearly and precisely. Reference specific clauses and terms when relevant.',
        },
        { role: 'user', content: combinedInput },
      ],
    })

    const assistantText = response.choices[0]?.message?.content ?? FALLBACK

    const savedUser = await createMessage(sessionId, 'user', userMessage)
    const savedAssistant = await createMessage(sessionId, 'assistant', assistantText)
    await updateSession(sessionId, { status: 'completed' })

    return NextResponse.json({
      userMessage: savedUser,
      assistantMessage: savedAssistant,
    })
  } catch (err) {
    await updateSession(sessionId, { status: 'error' }).catch(() => {})
    console.error('Azure chat error:', err)
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
