import { NextRequest, NextResponse } from 'next/server'
import { ConfidentialClientApplication } from '@azure/msal-node'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=azure_denied', req.url))
  }

  const msalClient = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    },
  })

  try {
    const result = await msalClient.acquireTokenByCode({
      code,
      scopes: ['https://ml.azure.com/user_impersonation', 'offline_access'],
      redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/microsoft/callback`,
    })

    if (!result?.accessToken) {
      return NextResponse.redirect(new URL('/dashboard?error=azure_token', req.url))
    }

    cookies().set('azure_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    })

    return NextResponse.redirect(new URL('/dashboard', req.url))
  } catch {
    return NextResponse.redirect(new URL('/dashboard?error=azure_auth', req.url))
  }
}
