import OpenAI from 'openai'

let client: OpenAI | null = null

export function getAzureClient(): OpenAI {
  client = null // always recreate so env changes are picked up

  const apiKey = process.env.AZURE_API_KEY
  const baseURL = process.env.AZURE_OPENAI_ENDPOINT

  if (!apiKey || !baseURL) {
    throw new Error('Missing Azure env vars: AZURE_API_KEY, AZURE_OPENAI_ENDPOINT')
  }

  client = new OpenAI({
    baseURL,
    apiKey,
    defaultHeaders: { 'api-key': apiKey },
    defaultQuery: { 'api-version': '2025-05-15-preview' },
  })

  return client
}
