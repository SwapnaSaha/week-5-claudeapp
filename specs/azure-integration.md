# Azure AI Integration Spec

## Feature Name
Azure AI Agent Integration and Microsoft OAuth

## Description
The app calls an Azure AI Foundry agent for contract analysis. All Azure calls are made server-side from `app/api/chat/route.ts` — never from the client. Authentication uses Microsoft OAuth 2.0 via `@azure/msal-node`. The access token is stored in an HTTP-only cookie (`azure_token`). API version must be exactly `2025-05-01`. API keys do NOT work — only Azure AD Bearer tokens are accepted.

---

## Auth Flow Overview

```
User clicks "Connect with Microsoft"
  → GET /api/auth/microsoft
  → Redirect to Microsoft login
  → GET /api/auth/microsoft/callback (receives ?code=...)
  → acquireTokenByCode
  → Store access token in HTTP-only cookie azure_token
  → Redirect to /dashboard
```

---

## Microsoft OAuth Routes

### `GET /api/auth/microsoft`

1. Instantiate `ConfidentialClientApplication` from `@azure/msal-node` with:
   - `clientId`: `AZURE_CLIENT_ID`
   - `clientSecret`: `AZURE_CLIENT_SECRET`
   - `authority`: `https://login.microsoftonline.com/{AZURE_TENANT_ID}`
2. Call `getAuthCodeUrl` with scopes: `["https://ml.azure.com/user_impersonation", "offline_access"]` and redirectUri: `NEXTAUTH_URL + /api/auth/microsoft/callback`
3. Redirect the user to the generated URL

### `GET /api/auth/microsoft/callback`

1. Extract `code` from query string
2. Call `acquireTokenByCode` with the same scopes and redirectUri
3. Store the access token in an HTTP-only cookie named `azure_token`:
   - `httpOnly: true`
   - `secure: true` in production
   - `sameSite: 'lax'`
   - `path: '/'`
   - `maxAge`: match the token expiry (typically 3600s / 1 hour)
4. Redirect to `/dashboard`

---

## Chat API Route (`POST /api/chat`)

**File:** `app/api/chat/route.ts`

### Request

```ts
{
  contractText: string,   // extracted file text (may be empty string)
  userMessage: string,    // user's question
  sessionId: string       // Supabase session ID
}
```

### Step-by-step

1. Read `azure_token` cookie → return 401 `{ error: 'Not connected' }` if missing
2. Read `contractText`, `userMessage`, `sessionId` from request body
3. Create a new thread:
   ```
   POST {AZURE_AGENT_ENDPOINT_URL}/threads?api-version=2025-05-01
   Authorization: Bearer {azure_token}
   Content-Type: application/json
   ```
4. Add a user message to the thread:
   ```
   POST {AZURE_AGENT_ENDPOINT_URL}/threads/{threadId}/messages?api-version=2025-05-01
   body: {
     role: "user",
     content: contractText
       ? `Contract:\n\n${contractText}\n\nQuestion: ${userMessage}`
       : userMessage
   }
   ```
5. Start a run against the agent:
   ```
   POST {AZURE_AGENT_ENDPOINT_URL}/threads/{threadId}/runs?api-version=2025-05-01
   body: { assistant_id: AZURE_AGENT_ID }
   ```
6. Poll run status every 1.5 seconds:
   ```
   GET {AZURE_AGENT_ENDPOINT_URL}/threads/{threadId}/runs/{runId}?api-version=2025-05-01
   ```
   - Continue while status is `queued` or `in_progress`
   - Stop on `completed`, `failed`, `cancelled`, `expired`
   - Timeout after 45 seconds → return 408 `{ error: 'Request timed out' }`
7. If run failed/cancelled/expired: return 500 `{ error: 'Azure agent run failed' }`
8. Retrieve the assistant message from the thread:
   ```
   GET {AZURE_AGENT_ENDPOINT_URL}/threads/{threadId}/messages?api-version=2025-05-01
   ```
   Take the first message with `role = "assistant"`
9. Save both messages to Supabase via `createMessage` in `lib/db.ts`
10. Update session `status = 'completed'` via `updateSession`
11. Return `{ content: string, sessionId: string }`

### Token Refresh

Access tokens expire after ~1 hour. If the Azure API returns 401:
1. Attempt silent refresh via `acquireTokenSilent`
2. If that fails: return 401 to client → client redirects user to `/api/auth/microsoft`

---

## Response Codes

| Status | Body | Condition |
|---|---|---|
| 200 | `{ content, sessionId }` | Success |
| 401 | `{ error: 'Not connected' }` | `azure_token` cookie missing or expired |
| 408 | `{ error: 'Request timed out' }` | Azure poll exceeded 45s |
| 500 | `{ error: 'Server error' }` | Unexpected failure or agent run failed |

---

## Azure Connect Banner (Phase 11)

Shown in `app/dashboard/page.tsx` when `azure_token` cookie is absent.

- Full-width banner at top of main content, `an-warning` tinted background
- Text: "Connect with Microsoft to start analyzing contracts"
- CTA button: "Connect with Microsoft" → links to `/api/auth/microsoft`

Composer send button in `components/Composer.tsx`:
- Disabled when Azure not connected
- Tooltip on hover: "Connect with Microsoft to send messages"

---

## Logout

`GET /api/auth/logout`:
- Deletes the `azure_token` HTTP-only cookie
- Client clears `userId` and `userEmail` from localStorage
- Redirects to `/login`

---

## Environment Variables

| Variable | Where to find it |
|---|---|
| `AZURE_CLIENT_ID` | Azure Portal → App registrations → your app → Application (client) ID |
| `AZURE_CLIENT_SECRET` | Azure Portal → App registrations → Certificates & secrets → secret value |
| `AZURE_TENANT_ID` | Azure Portal → App registrations → Directory (tenant) ID |
| `AZURE_AGENT_ENDPOINT_URL` | Azure AI Foundry → project Overview → endpoint URL (`https://<name>.services.ai.azure.com/api/projects/<project>`) |
| `AZURE_AGENT_ID` | Azure AI Foundry → Agents → click agent → copy `asst_xxx` ID |
| `NEXTAUTH_URL` | `http://localhost:3000` (dev) |

---

## Packages

```bash
npm install @azure/msal-node
```

Do NOT install `@azure/openai` — this uses the Azure AI Foundry Agents REST API directly.

---

## One-Time Azure Setup

1. Azure Portal → Azure Active Directory → App registrations → New registration
2. Set redirect URIs:
   - `http://localhost:3000/api/auth/microsoft/callback` (dev)
   - `https://yourdomain.com/api/auth/microsoft/callback` (production)
3. Add API permission: Azure Machine Learning → Delegated → `user_impersonation`
4. Grant admin consent
5. Create a client secret — copy the value immediately
6. Copy: Application (client) ID, Directory (tenant) ID, secret value

---

## Error Diagnosis

| Error | Cause | Fix |
|---|---|---|
| `Identity does not have permissions` | Using API key instead of Bearer token | Use OAuth token only |
| `BadRequest: API version not supported` | Wrong API version | Use `2025-05-01` exactly |
| `Invalid 'assistant_id': expected 'asst'` | Passing display name as assistant_id | Use `asst_xxx` ID from Foundry |
| 401 on chat route | Cookie missing or expired | Redirect to `/api/auth/microsoft` |
| 403 from Azure | User lacks Azure AI Agent Operator role | Assign role in Azure AI Foundry project |

---

## What NOT to Do

- Do not use an API key for the Agents endpoint
- Do not call Azure from the client side
- Do not store tokens in localStorage — HTTP-only cookies only
- Do not install `@azure/openai`
- Do not pass agent display name as `assistant_id`
- Do not hardcode any credentials

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Cookie absent when chat is sent | Return 401; client shows "Not connected" error + banner |
| Token expired mid-session | Attempt silent refresh; on failure redirect to Microsoft login |
| Azure poll times out (45s) | Return 408; show "Request timed out" below composer |
| Agent run fails | Return 500; show error inline; do not save incomplete messages |
| User not connected, tries to send | Send button disabled; tooltip explains action needed |
