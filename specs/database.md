# Database Spec

## Feature Name
Database Schema and Helper Functions

## Description
PostgreSQL database hosted on Supabase. Four tables: `users`, `sessions`, `messages`, `feedback`. All database access goes through thin wrapper functions in `lib/db.ts`. No Supabase Auth — custom `users` table with bcrypt hashed passwords. All functions throw on error; no silent swallowing.

---

## Schema

### `users`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` |
| `email` | TEXT | UNIQUE, NOT NULL |
| `password_hash` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |

### `sessions`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` |
| `user_id` | UUID | NOT NULL, FK → `users.id` ON DELETE CASCADE |
| `title` | TEXT | NOT NULL, DEFAULT `'New session'` |
| `status` | TEXT | NOT NULL, DEFAULT `'idle'`, CHECK IN (`idle`, `processing`, `completed`, `error`) |
| `pinned` | BOOLEAN | NOT NULL, DEFAULT `false` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` — auto-updated via trigger |

### `messages`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` |
| `session_id` | UUID | NOT NULL, FK → `sessions.id` ON DELETE CASCADE |
| `role` | TEXT | NOT NULL, CHECK IN (`user`, `assistant`) |
| `content` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |

### `feedback`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` |
| `user_id` | UUID | NOT NULL, FK → `users.id` ON DELETE CASCADE |
| `session_id` | UUID | NOT NULL, FK → `sessions.id` ON DELETE CASCADE |
| `rating` | INTEGER | NOT NULL, CHECK `rating >= 1 AND rating <= 5` |
| `comment` | TEXT | Optional (nullable) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |

---

## Trigger

Auto-update `sessions.updated_at` on every row update:

```sql
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
```

---

## Indexes

| Index | Table | Columns | Purpose |
|---|---|---|---|
| `idx_sessions_user_id` | sessions | `user_id` | Filter sessions by user |
| `idx_sessions_updated_at` | sessions | `updated_at DESC` | Sort sessions by recency |
| `idx_sessions_pinned` | sessions | `(user_id, pinned) WHERE pinned = true` | Fast pinned filter |
| `idx_messages_session_id` | messages | `session_id` | Load messages for a session |
| `idx_messages_created_at` | messages | `created_at ASC` | Ordered message fetch |
| `idx_feedback_session_id` | feedback | `session_id` | Fetch feedback for a session |
| `idx_feedback_user_id` | feedback | `user_id` | Fetch feedback by user |

---

## Helper Functions — `lib/db.ts`

| Function | Signature | Description |
|---|---|---|
| `getUser` | `(email: string)` → user row \| null | Query users by email |
| `createUser` | `(email: string, passwordHash: string)` → user row | Insert new user, return created row |
| `createSession` | `(userId: string, title?: string)` → session row | Insert session, default title `'New session'` |
| `getSessions` | `(userId: string)` → session[] | Return sessions ordered pinned DESC, updated_at DESC |
| `getSession` | `(sessionId: string)` → session row \| null | Return single session row |
| `updateSession` | `(sessionId: string, fields: Partial<{title, status, pinned}>)` → session row | PATCH any combination of title / status / pinned |
| `deleteSession` | `(sessionId: string)` → void | Delete session — cascades to messages + feedback |
| `createMessage` | `(sessionId: string, role: 'user' \| 'assistant', content: string)` → message row | Insert message row |
| `getMessages` | `(sessionId: string, limit?: number, before?: string)` → message[] | Return messages ASC by created_at, with optional pagination |
| `createFeedback` | `(userId: string, sessionId: string, rating: number, comment?: string)` → feedback row | Insert feedback row |

All functions use the Supabase client from `lib/supabase.ts`. All throw on Supabase error.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |

---

## Setup SQL

Run in Supabase SQL Editor before starting the app:

```sql
create extension if not exists "pgcrypto";

create table if not exists users (
  id            uuid        primary key default gen_random_uuid(),
  email         text        unique not null,
  password_hash text        not null,
  created_at    timestamptz not null default now()
);

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

create table if not exists messages (
  id         uuid        primary key default gen_random_uuid(),
  session_id uuid        not null references sessions(id) on delete cascade,
  role       text        not null check (role in ('user', 'assistant')),
  content    text        not null,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references users(id) on delete cascade,
  session_id uuid        not null references sessions(id) on delete cascade,
  rating     integer     not null check (rating >= 1 and rating <= 5),
  comment    text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_user_id    on sessions(user_id);
create index if not exists idx_sessions_updated_at on sessions(updated_at desc);
create index if not exists idx_sessions_pinned     on sessions(user_id, pinned) where pinned = true;
create index if not exists idx_messages_session_id on messages(session_id);
create index if not exists idx_messages_created_at on messages(created_at asc);
create index if not exists idx_feedback_session_id on feedback(session_id);
create index if not exists idx_feedback_user_id    on feedback(user_id);
```
