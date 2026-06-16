# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev Commands

```bash
npm run dev        # start dev server at http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
```

No test suite configured yet.

## Architecture

Next.js 14 App Router + TypeScript + Tailwind CSS. Three main surfaces:
- **Auth** (`/login`, `/signup`) — light mode, standalone pages, no layout shell
- **Dashboard** (`/dashboard`) — post-login home with KPI cards and activity feed
- **Chat** (`/chat/[sessionId]`) — 3-panel layout: Sidebar (256px) | ChatArea (flex-1) | RightPanel (304px)

### Key directories

| Path | Purpose |
|---|---|
| `app/` | Next.js App Router pages and API routes |
| `app/api/` | Server-only API routes (auth, chat, sessions, feedback) |
| `components/` | Shared React components |
| `lib/supabase.ts` | Supabase client (singleton) |
| `lib/db.ts` | All database helper functions — thin Supabase wrappers |
| `blueprint/` | App plan and specs |

## Auth Rules

- **No Supabase Auth** — uses a custom `users` table with bcrypt password hashing (`bcryptjs`, 10 rounds)
- On login success: store `userId` and `userEmail` in `localStorage`
- Auth guard: check `localStorage.getItem('userId')` on mount in every protected page; redirect to `/login` if missing
- Logout: clear localStorage + delete `azure_token` HTTP-only cookie → redirect to `/login`

## Azure Rules

- **Never call Azure from the client.** All Azure AI calls go through `app/api/chat/route.ts` only.
- Auth type: **Azure AD Bearer token** via `@azure/msal-node` OAuth flow — API keys will not work.
- Token stored in an HTTP-only cookie `azure_token` after Microsoft OAuth callback.
- API version must be exactly `2025-05-01`.
- Required env vars: `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_AGENT_ENDPOINT_URL`, `AZURE_AGENT_ID`.

## File Parsing Rules

- Accept `.pdf` and `.docx` only; max 10 MB; validate before parsing.
- **PDF**: parsed client-side with `pdfjs-dist`. Worker must be at `/public/pdf.worker.min.mjs`.
- **DOCX**: parsed client-side with `mammoth` (`extractRawText`).
- Parsed text is stored in `ChatArea` component state only — never persisted to Supabase.
- The file's blob URL is created for preview and revoked when the file is dismissed.

## Design System

All colors use CSS custom properties with the `an-` prefix. Never hardcode hex values in components — use Tailwind tokens like `bg-an-bg-base`, `text-an-fg-subtle`, `border-an-border`.

| Surface | Theme |
|---|---|
| Dashboard, chat | Dark mode (`:root` default) |
| Login, signup, landing | Light mode (`data-theme="light"` on wrapper div) |

Fonts: `font-sans` = Inter, `font-display` = Lora, `font-mono` = JetBrains Mono.
Icons: Lucide React, 1.5px stroke, 16px default size.

## Database Schema

Four tables in Supabase (PostgreSQL): `users`, `sessions`, `messages`, `feedback`.
All helper functions live in `lib/db.ts`. See `blueprint/app-plan.md` for the full SQL.

Sessions have `status` (`idle` | `processing` | `completed` | `error`) and `pinned` (boolean).
Messages have `role` (`user` | `assistant`).

## Phase Completion Status

| Phase | Status |
|---|---|
| 1 — Project setup | Done |
| 2 — Database helpers | Done |
| 3 — Auth | Done |
| 4 — Dashboard layout | Done |
| 5 — Chat interface | Done |
| 6 — File upload + parsing | Done |
| 7 — Azure AI integration | Done |
| 8 — Right panel | Done |
| 9 — Feedback | Done |
| 10 — Landing page | Done |
| 11 — Azure connect flow | Done |
| 12 — Polish | Done |
