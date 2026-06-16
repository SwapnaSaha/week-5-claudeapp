# Chat Spec

## Feature Name
Chat Interface

## Description
Single-session conversational UI for legal contract analysis. Users type questions about an uploaded contract; responses come from an Azure AI Foundry agent via `POST /api/chat`. Responses are returned as a complete payload (no streaming). Conversation history is persisted in Supabase. The interface lives at `/chat/[sessionId]` inside the 3-panel app shell.

---

## User Flow

1. User clicks "New Chat" in the sidebar → session created → navigate to `/chat/[id]`
2. User attaches a PDF or DOCX contract via the paperclip icon (required for analysis)
3. User types a question and clicks Send (or presses Enter)
4. Optimistic user message appears immediately in the message list
5. Loading indicator shown while waiting for Azure response
6. Complete assistant response rendered when API returns
7. FeedbackWidget appears below each assistant message
8. Session title auto-updated after first assistant response (if still 'New session')
9. User can continue asking questions in the same session
10. User selects a previous session from the sidebar → full history loads

---

## Shared Context State — CRITICAL

`ChatArea` is the owner of all shared state. It is the parent component for the entire chat view.

| State | Type | Owner | Why it must live here |
|---|---|---|---|
| `messages` | Message[] | ChatArea | MessageList and streaming state both need it |
| `isLoading` | boolean | ChatArea | Composer and MessageList both need it |
| `contractText` | string | ChatArea | Must be sent with every API call |
| `contractName` | string | ChatArea | Shown in file chip in Composer |
| `blobUrl` | string | ChatArea | Passed to RightPanel for preview |
| `fileType` | string | ChatArea | RightPanel needs it to choose renderer |
| `executionSteps` | Step[] | ChatArea | RightPanel reads this to show step progress |

FileUpload component is stateless — it calls `onFileLoaded(text, name, blobUrl, fileType)` and owns no state.

---

## Message Rendering

**User message:**
- Alignment: right (max-width 75%)
- Background: `an-accent-subtle`
- Border: `1px solid rgba(217,119,87,0.20)`
- Border-radius: `12px 12px 4px 12px`
- Padding: `12px 16px`
- Font: 14px `an-fg-base`

**Assistant message:**
- Alignment: left (full max-width 680px)
- No bubble background — text on `an-bg-base` directly
- Prefix: small coral dot (8px) or Claude icon (16px)
- Font: 14px `an-fg-base`, line-height 1.6
- Markdown rendered (basic: bold, italic, code spans, code blocks)
- Code blocks: `an-bg-surface` background, `font-mono` (JetBrains Mono 13px)

**Message timestamps:**
- Today: `HH:MM` format
- Older: `DD MMM HH:MM`
- Placement: below message bubble, `an-fg-muted` 12px
- Always visible (not hover-only)

---

## Non-Streaming Responses

This app does NOT use streaming. The API route waits for the full Azure response and returns it as a single JSON payload.

Client flow:
1. Set `isLoading = true`
2. Show typing/loading indicator in message list
3. `await fetch('/api/chat', { method: 'POST', body: ... })`
4. On success: append assistant message to `messages[]`, set `isLoading = false`
5. On error: remove optimistic user message, show error state, set `isLoading = false`

---

## Conversation History

- All messages persisted immediately by the API route after Azure responds
- On session load: fetch `GET /api/messages?sessionId=[id]` → render full history
- Ordered ASC by `created_at`
- No pagination for MVP (load all messages for a session)
- History cleared immediately when switching sessions (prevents flash of old content)

---

## Message Bubble Styling (summary)

| Type | Alignment | Background | Border-radius |
|---|---|---|---|
| User | Right | `an-accent-subtle` | `12px 12px 4px 12px` |
| Assistant | Left | None (transparent) | — |

Max width for messages container: 680px, centered in flex-1 column.

---

## Composer (`components/Composer.tsx`)

- Pinned to bottom of chat area
- Container: `an-bg-surface` background, `an-border` border, `border-radius: 12px`, `padding: 12px 16px`
- Textarea: borderless, bg transparent, auto-expands up to 200px, resize: none
- Paperclip icon (16px) — triggers file picker (see file-upload.md)
- File chip: shown when file is attached — filename + dismiss (×) button
- Send button: coral accent, 32px circle, bottom-right
- Send disabled when: `isLoading = true` OR Azure not connected
- Tooltip on disabled send: "Connect with Microsoft to send messages"
- Enter to send (Shift+Enter for new line)

---

## Components

| Component | File | Responsibility | Key props |
|---|---|---|---|
| ChatArea | `components/ChatArea.tsx` | Orchestrates all chat sub-components; owns all state | sessionId |
| MessageList | `components/MessageList.tsx` | Scrollable message list, auto-scrolls to bottom | messages, isLoading |
| MessageBubble | `components/MessageBubble.tsx` | Renders single message | role, content, createdAt |
| Composer | `components/Composer.tsx` | Input, file chip, send button | onSend, onFileLoaded, isLoading, isConnected, contractName |
| FeedbackWidget | `components/FeedbackWidget.tsx` | Star rating + comment; shown below each assistant bubble | sessionId, onSubmit |

---

## Optimistic Updates

1. On send: append `{ id: 'optimistic-{Date.now()}', role: 'user', content, createdAt: new Date() }` to `messages[]` immediately
2. Show loading indicator (typing animation or spinner)
3. On API success: the API saves both messages and returns the assistant message; append it to `messages[]`
4. On API failure: remove the optimistic message, show error below composer

---

## API Routes

### `POST /api/chat`
**Request body:** `{ contractText: string, userMessage: string, sessionId: string }`
**Success response:** `{ content: string, sessionId: string }`
**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `{ error: 'Not connected' }` | `azure_token` cookie missing |
| 408 | `{ error: 'Request timed out' }` | Azure poll exceeded 45s |
| 500 | `{ error: 'Server error' }` | Unexpected failure |

### `GET /api/messages?sessionId=[id]`
Returns all messages for a session ordered by `created_at ASC`.
Response: `Message[]`

### `PATCH /api/sessions/[id]`
Used to update title (auto-title after first response) and status.
See `specs/dashboard.md`.

---

## History Loading

- Clear `messages[]` immediately when a new sessionId is selected
- Show skeleton rows while loading
- Fetch `GET /api/messages?sessionId=[id]`
- On error: inline "Failed to load messages" with a Retry button
- On success: render full history, scroll to bottom

---

## Auto-Generated Titles

- Triggers after the first assistant response
- Condition: `session.title === 'New session'`
- New title: first 55 chars of first user message + `'…'` if truncated
- PATCH `sessions.title` via `PATCH /api/sessions/[id]`
- Update sidebar session list optimistically

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Send without a file attached | Allowed — contractText is empty string; Azure receives only the userMessage |
| Switch sessions while loading | Cancel in-flight request; clear loading state |
| Send fails (Azure error) | Roll back optimistic message; show error below composer |
| Empty / whitespace message | Disable send button; do not call API |
| Azure not connected | Send button disabled with tooltip; banner shown on dashboard |
| Very long response | Render fully — no truncation |
| Session with no messages | Show empty state: "Attach a contract and ask a question to get started" |
