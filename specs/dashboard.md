# Dashboard Spec

## Feature Name
Dashboard Layout and Home View

## Description
Three-panel app shell used by `/dashboard` and `/chat/[sessionId]`. Sidebar (256px) on the left, flex-1 main content in the center, RightPanel (304px) on the right. The dashboard home view shows KPI metric cards and a recent activity feed. Sidebar contains session management (list, search, filter, CRUD). All panels are dark mode.

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Sidebar 256px   │  Main content flex-1  │  RightPanel 304px │
│  bg-an-bg-subtle │  bg-an-bg-base        │  bg-an-bg-subtle  │
└──────────────────────────────────────────────────────────────┘
```

- Shell lives in `app/dashboard/layout.tsx`
- Sidebar and RightPanel are always visible
- Main slot renders either the dashboard home or the active chat

---

## State Architecture

`app/dashboard/layout.tsx` renders the shell but keeps minimal state.
`app/dashboard/page.tsx` owns KPI and activity data.
`app/chat/[sessionId]/page.tsx` owns chat state.

Sidebar receives:
- `sessions` — list of session rows
- `activeSesionId` — currently viewed session
- Callbacks: `onNewChat`, `onSelectSession`, `onDeleteSession`, `onUpdateSession`

RightPanel receives props from ChatArea (executionSteps, filePreview) when in chat view; shows empty state on dashboard home.

---

## Home / Default View (`app/dashboard/page.tsx`)

### KPI Cards
3-column grid. Fetched with a single `GET /api/dashboard` call that returns all metrics.

| Metric | Source | Calculation |
|---|---|---|
| Total sessions | `sessions` table | COUNT all sessions for userId |
| Sessions today | `sessions` table | COUNT where `created_at::date = today` |
| Total messages | `messages` table | COUNT all messages across user's sessions |
| Messages this week | `messages` table | COUNT where `created_at >= now() - interval '7 days'` |
| Active sessions | `sessions` table | COUNT where `status = 'processing'` |
| Pinned count | `sessions` table | COUNT where `pinned = true` |
| Avg feedback rating | `feedback` table | AVG(rating) for user's sessions, 1 decimal |
| Failed sessions | `sessions` table | COUNT where `status = 'error'` |

Loading state: skeleton placeholder same size as value.
Error state: show `--` with muted sub-label.
Card layout: `an-bg-surface` background, `an-border` border, `border-radius: 8px`, `padding: 16px`.
Card anatomy: label (12px muted), primary value (28px base), optional sub-label (12px muted).

### Activity Feed
Last 50 events from messages + sessions combined, sorted by most recent.

| Event type | Icon | Label format |
|---|---|---|
| Session created | `PlusCircle` | "New session: [title]" |
| Message sent (user) | `MessageSquare` | "You asked in [session title]" |
| Message received | `Bot` | "AI responded in [session title]" |
| Session completed | `CheckCircle2` | "[title] marked completed" |
| Session error | `AlertCircle` | "[title] encountered an error" |
| Session pinned | `Pin` | "[title] pinned" |

Derived from existing `messages` and `sessions` tables — no dedicated activity table.
Each row: icon (16px), label text (13px `an-fg-subtle`), relative timestamp (12px `an-fg-muted`, right-aligned).
Relative time: "just now" (< 1 min), "Xm ago", "Xh ago", "yesterday", full date for older.
Empty state: "No activity yet. Start a new chat to get going."

---

## Sidebar (`components/Sidebar.tsx`)

Width: 256px. Background: `an-bg-subtle`. Full viewport height.

Top-to-bottom layout:
1. Logo + "Claude Legal" app name (24px padding, Lora font)
2. "New Chat" button — full width, below logo
3. Search input (client-side filter)
4. Filter tabs
5. Scrollable session list
6. User email + logout (pinned to bottom, 16px padding)

### New Chat Button
- Calls `POST /api/sessions` → creates session with default title → navigate to `/chat/[id]`
- Full width, primary accent style

### Search
- Appears above session list
- Filters by session title, client-side (no API call)
- Composes with active filter tab (both applied simultaneously)
- No-match state: "No sessions found" in muted text

### Filter Tabs

| Tab | Filter logic |
|---|---|
| All | No filter — all sessions |
| Pinned | `pinned = true` |
| Recent | Last 7 days by `updated_at` |
| Processing | `status = 'processing'` |
| Completed | `status = 'completed'` |
| Error | `status = 'error'` |

Default: "All". Active tab: `an-accent` text + `an-accent-subtle` background. Inactive: `an-fg-muted`.

### Session List (`components/SessionItem.tsx`)
Each item:
- Height: 36px, padding: 0 12px, border-radius: 6px
- Status icon (left, 14px): `Loader2` spin (processing), `CheckCircle2` success (completed), `AlertCircle` error, `Circle` (idle)
- Title: 13px truncated to 1 line, `an-fg-subtle` default → `an-fg-base` on hover/active
- Date: 12px `an-fg-muted`, right-aligned
- Active: `an-bg-elevated` background
- Sort: pinned sessions first (pin dot indicator), then by `updated_at` DESC

### Session Context Menu
Triggered on hover (three-dot button, 16px, appears right of the date).

| Action | Behavior |
|---|---|
| Pin / Unpin | PATCH `sessions.pinned`; update local state |
| Rename | Inline text input replaces title; confirm on Enter/blur; PATCH `sessions.title` |
| Delete | Confirmation dialog → DELETE `/api/sessions/[id]`; remove from local state |

Destructive (Delete): shown in `an-error` color. Confirmation required.
Close: outside click or Escape.

### User Footer
- Shows `userEmail` from localStorage (13px `an-fg-subtle`)
- Logout button: clears `userId` + `userEmail` from localStorage, calls `GET /api/auth/logout` to delete `azure_token` cookie, redirects to `/login`

---

## API Routes

### `GET /api/dashboard`
Returns all KPI metrics for the authenticated user.
Auth: reads `userId` from request (passed as query param or inferred from session).
Response: `{ totalSessions, sessionsToday, totalMessages, messagesThisWeek, activeSessions, pinnedCount, avgFeedbackRating, failedSessions }`

### `POST /api/sessions`
Creates a new session.
Request: `{ userId: string, title?: string }`
Response: `{ id, user_id, title, status, pinned, created_at, updated_at }`

### `PATCH /api/sessions/[id]`
Updates title, status, or pinned.
Request: `{ title?, status?, pinned? }`
Response: updated session row.

### `DELETE /api/sessions/[id]`
Deletes session (cascades to messages + feedback).
Response: `{ success: true }`

---

## Components

| Component | File | Responsibility | Key props |
|---|---|---|---|
| Shell | `app/dashboard/layout.tsx` | 3-panel flex wrapper | children |
| Sidebar | `components/Sidebar.tsx` | Nav, session list, user footer | sessions, activeSessionId, callbacks |
| SessionItem | `components/SessionItem.tsx` | Single session row + context menu | session, isActive, onPin, onRename, onDelete |
| KpiCard | `components/KpiCard.tsx` | Single metric card | label, value, subLabel |
| ActivityFeed | `components/ActivityFeed.tsx` | Scrollable event list | events[] |
| RightPanel | `components/RightPanel.tsx` | Steps + file preview | executionSteps, filePreview (see right-panel.md) |

---

## Azure Connect Banner
Shown in `app/dashboard/page.tsx` when the `azure_token` cookie is absent.

- Full-width banner at top of main content area, `an-warning` tinted background
- Text: "Connect with Microsoft to start analyzing contracts"
- Button: "Connect with Microsoft" → links to `/api/auth/microsoft`

---

## Edge Cases

| Scenario | Handling |
|---|---|
| No sessions yet | Empty state: "No sessions yet. Click 'New Chat' to start." |
| KPI fetch fails | Show `--` in each card with muted error sub-label |
| Delete the active session | Navigate to `/dashboard` after deletion |
| Rename with empty string | Client-side block — revert to previous title |
| Filter + search = zero results | "No sessions found" in muted text |
| Rapid session switching | Clear messages immediately on selection to prevent flash of stale content |
| Not logged in (localStorage missing) | Redirect to `/login` on mount |
