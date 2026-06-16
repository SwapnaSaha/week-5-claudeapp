# App Plan — Legal Contract Review App

## Context

Full-stack AI legal contract analysis app built on Next.js 14 + TypeScript + Tailwind CSS. Users upload PDF/DOCX contracts, ask questions, and receive AI-powered analysis via Azure AI Foundry agents. All sessions, messages, and feedback are persisted in Supabase PostgreSQL. Custom auth using a `users` table + bcrypt (no Supabase Auth).

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · Azure AI Foundry · pdfjs-dist · mammoth · bcryptjs · @azure/msal-node · lucide-react

---

## Phase 1 — Project Setup (DONE)

Created: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs`, `postcss.config.mjs`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (redirects to `/login`), `lib/supabase.ts`, `.env.local`.

---

## Phase 2 — Database Helpers

**File:** `lib/db.ts`

| Function | Description |
|---|---|
| `getUser(email)` | Query users table by email; return row or null |
| `createUser(email, passwordHash)` | Insert new user; return created row |
| `createSession(userId, title?)` | Insert session with default title 'New session' |
| `getSessions(userId)` | Return sessions ordered pinned desc, updated_at desc |
| `getSession(sessionId)` | Return single session row |
| `updateSession(sessionId, fields)` | PATCH title / status / pinned |
| `deleteSession(sessionId)` | Delete session (cascades to messages + feedback) |
| `createMessage(sessionId, role, content)` | Insert message row |
| `getMessages(sessionId, limit?, before?)` | Return messages ordered created_at asc |
| `createFeedback(userId, sessionId, rating, comment?)` | Insert feedback row |

All functions throw on Supabase error — no silent swallowing.

---

## Phase 3 — Auth

### Pages
- `app/login/page.tsx` — light mode card (480px), email + password, link to signup → stores `userId` + `userEmail` in localStorage → `/dashboard`
- `app/signup/page.tsx` — same card + confirm password field → same storage + redirect

### API Routes
- `POST /api/auth/signup` — check email exists (409) → bcrypt hash (10 rounds) → insert user → return `{ id, email }`
- `POST /api/auth/login` — query by email → bcrypt compare → 401 with generic message on any failure → return `{ id, email }`

### Auth Guard
`useEffect` on mount: `localStorage.getItem('userId')` → redirect to `/login` if missing.

---

## Phase 4 — Dashboard Layout

### Shell
`app/dashboard/layout.tsx` — full viewport flex row: `<Sidebar>` (256px) + `{children}` (flex-1) + `<RightPanel>` (304px).

### Sidebar (`components/Sidebar.tsx`)
- Logo + app name
- "New Chat" button → `createSession` + navigate to `/chat/[id]`
- Search input (client-side filter)
- Filter tabs: All / Pinned / Recent / Processing / Completed / Error
- Scrollable session list (`components/SessionItem.tsx`)
- User email + logout at bottom

### Session Item (`components/SessionItem.tsx`)
- 36px height, truncated title, right-aligned date, status icon
- Hover: three-dot context menu → Pin/Unpin, Rename (inline), Delete (confirmation)

### Dashboard Home (`app/dashboard/page.tsx`)
- KPI grid (3-col): total sessions, sessions today, total messages, messages this week, active sessions, pinned count, avg feedback rating, failed sessions
- Activity feed: last 50 events from messages + sessions, relative timestamps

---

## Phase 5 — Chat Interface

### Route
`app/chat/[sessionId]/page.tsx` — loads session + messages on mount; 3-panel shell

### Components

| Component | Responsibility | Key state owned |
|---|---|---|
| `ChatArea` | Orchestrates all chat sub-components | messages[], isLoading, contractText, contractName, blobUrl, fileType, executionSteps |
| `MessageList` | Scrollable message list, auto-scrolls to bottom | — |
| `MessageBubble` | Renders single message; user=right accent bubble, assistant=left no bubble | — |
| `Composer` | Textarea + paperclip + send button | — (calls onSend callback) |
| `FeedbackWidget` | Stars + comment; appears after every assistant message | submitted state |

### Session CRUD
- `PATCH /api/sessions/[id]` — update title, status, pinned
- `DELETE /api/sessions/[id]` — cascade delete

### Auto-title
After first assistant response, if title is still 'New session': truncate first user message to 55 chars + '…' → PATCH sessions.

---

## Phase 6 — File Upload & Parsing

### Component (`components/FileUpload.tsx`)
- Hidden `<input type="file">` triggered by paperclip icon
- Accepts `.pdf`, `.docx` only; max 10 MB
- Calls `onFileLoaded(text, name, blobUrl, fileType)` — never owns state
- Shows filename chip + dismiss button after attach

### Parsing
| Type | Library | Setup |
|---|---|---|
| PDF | `pdfjs-dist` | `GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'`; iterate pages |
| DOCX | `mammoth` | `mammoth.extractRawText({ arrayBuffer })` |

Copy `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` → `public/pdf.worker.min.mjs`.

---

## Phase 7 — Azure AI Integration

### Microsoft OAuth
- `GET /api/auth/microsoft` — generate login URL via `ConfidentialClientApplication`; redirect
- `GET /api/auth/microsoft/callback` — `acquireTokenByCode`; store in HTTP-only cookie `azure_token`; redirect to `/dashboard`

### Chat API (`POST /api/chat`)
1. Read `azure_token` cookie → 401 if missing
2. Body: `{ contractText, userMessage, sessionId }`
3. Create thread: `POST {AZURE_AGENT_ENDPOINT_URL}/threads?api-version=2025-05-01`
4. Add message (contractText as context prefix + userMessage)
5. Run thread against `AZURE_AGENT_ID`
6. Poll every 1.5s; timeout at 45s → 408
7. Retrieve assistant message
8. Save both messages to Supabase
9. Update session status
10. Return `{ content, sessionId }`

---

## Phase 8 — Right Panel (`components/RightPanel.tsx`)

**Execution steps section** (always visible): 5 steps with icon + label + status badge
1. Parsing document
2. Sending to Azure AI
3. Waiting for response
4. Processing response
5. Completed / Error

Steps driven by `executionSteps` state in `ChatArea`, updated during API call lifecycle.

**Document preview section** (shown when file attached):
- PDF: `<iframe src={blobUrl}>`
- DOCX: `<pre>` truncated at 4,000 chars with notice

Revoke blob URL on file dismiss.

---

## Phase 9 — Feedback

### API (`POST /api/feedback`)
Body: `{ sessionId, userId, rating, comment? }` → `createFeedback` → 201

### Widget behaviour
- Appears below every assistant bubble
- 1–5 star rating → reveals comment textarea
- Submit → collapses to "Thanks!" confirmation
- One submission per assistant message

---

## Phase 10 — Landing Page (`app/landing/page.tsx`)

Light mode. Root `/` redirects to `/landing` (if not logged in) or `/dashboard` (if logged in).

Sections:
1. Hero — Lora display font, headline, two CTAs (Get started / Login)
2. Features — 3-col cards (AI analysis, session history, document preview)
3. Disclaimer — "AI-generated analysis only. Consult a qualified professional."

---

## Phase 11 — Azure Connect Flow

Dashboard banner when `azure_token` cookie absent: "Connect with Microsoft" → `/api/auth/microsoft`.

Composer send button disabled with tooltip when not connected.

---

## Phase 12 — Polish

- Timestamps: `HH:MM` today; `DD MMM HH:MM` older
- Status icons: `Loader2` (processing), `CheckCircle2` (completed), `AlertCircle` (error), `Circle` (idle)
- `GET /api/auth/logout` — delete `azure_token` cookie; client clears localStorage → `/login`

---

## Database Schema

Run in Supabase SQL Editor:

```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Users
create table if not exists users (
  id            uuid        primary key default gen_random_uuid(),
  email         text        unique not null,
  password_hash text        not null,
  created_at    timestamptz not null default now()
);

-- Sessions
create table if not exists sessions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references users(id) on delete cascade,
  title      text        not null default 'New session',
  status     text        not null default 'idle'
               check (status in ('idle', 'processing', 'completed', 'error')),
  pinned     boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at on sessions
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sessions_updated_at
  before update on sessions
  for each row execute function update_updated_at();

-- Messages
create table if not exists messages (
  id         uuid        primary key default gen_random_uuid(),
  session_id uuid        not null references sessions(id) on delete cascade,
  role       text        not null check (role in ('user', 'assistant')),
  content    text        not null,
  created_at timestamptz not null default now()
);

-- Feedback
create table if not exists feedback (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references users(id) on delete cascade,
  session_id uuid        not null references sessions(id) on delete cascade,
  rating     integer     not null check (rating >= 1 and rating <= 5),
  comment    text,
  created_at timestamptz not null default now()
);

-- Performance indexes
create index if not exists idx_sessions_user_id    on sessions(user_id);
create index if not exists idx_sessions_updated_at on sessions(updated_at desc);
create index if not exists idx_sessions_pinned     on sessions(user_id, pinned) where pinned = true;
create index if not exists idx_messages_session_id on messages(session_id);
create index if not exists idx_messages_created_at on messages(created_at asc);
create index if not exists idx_feedback_session_id on feedback(session_id);
create index if not exists idx_feedback_user_id    on feedback(user_id);
```

---

## Files by Phase

| Phase | Files |
|---|---|
| 1 (done) | `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs`, `postcss.config.mjs`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `lib/supabase.ts`, `.env.local` |
| 2 | `lib/db.ts` |
| 3 | `app/login/page.tsx`, `app/signup/page.tsx`, `app/api/auth/signup/route.ts`, `app/api/auth/login/route.ts` |
| 4 | `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`, `components/Sidebar.tsx`, `components/SessionItem.tsx`, `components/KpiCard.tsx`, `components/ActivityFeed.tsx` |
| 5 | `app/chat/[sessionId]/page.tsx`, `components/ChatArea.tsx`, `components/MessageList.tsx`, `components/MessageBubble.tsx`, `components/Composer.tsx`, `app/api/sessions/[id]/route.ts` |
| 6 | `components/FileUpload.tsx`, `public/pdf.worker.min.mjs` |
| 7 | `app/api/auth/microsoft/route.ts`, `app/api/auth/microsoft/callback/route.ts`, `app/api/chat/route.ts` |
| 8 | `components/RightPanel.tsx` |
| 9 | `components/FeedbackWidget.tsx`, `app/api/feedback/route.ts` |
| 10 | `app/landing/page.tsx` |
| 11 | Azure banner in `app/dashboard/page.tsx` |
| 12 | `app/api/auth/logout/route.ts`, timestamp/status icon utilities |

---

## Environment Variables

| Variable | Status |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Filled |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Filled |
| `AZURE_CLIENT_ID` | Needs value |
| `AZURE_CLIENT_SECRET` | Needs value |
| `AZURE_TENANT_ID` | Needs value |
| `AZURE_AGENT_ENDPOINT_URL` | Needs value |
| `AZURE_AGENT_ID` | Needs value |
| `NEXTAUTH_URL` | `http://localhost:3000` |
