# Landing Page Spec

## Feature Name
Landing Page

## Description
A light-mode marketing page at `/landing` that introduces the app to unauthenticated visitors. The root `/` redirects to `/landing` if the user is not logged in, or to `/dashboard` if they are. The page has three sections: a hero, a features grid, and a disclaimer.

---

## Route Behaviour

- `/` → redirect to `/landing` (not logged in) or `/dashboard` (logged in)
- Auth check: `localStorage.getItem('userId')` on mount in `app/page.tsx`
- The landing page itself (`app/landing/page.tsx`) is publicly accessible — no auth guard

---

## Page Layout

Light mode only. Apply `data-theme="light"` to the top-level wrapper div.
Font for the page: Inter (body), Lora (hero headline).

### Section 1 — Hero
- Full-width section, centered content
- Headline: Lora display font (`text-display`, 28px, weight 500), primary text color
- Subheadline: Inter, 16px, `an-fg-subtle`, sentence case
- Suggested copy: "AI-powered legal contract analysis. Ask questions, get answers — instantly."
- Two CTA buttons side by side:
  - Primary: "Get started" → links to `/signup`
  - Ghost: "Log in" → links to `/login`
- Spacing: generous vertical padding (80px top/bottom)

### Section 2 — Features
- 3-column card grid
- Card style: `an-bg-surface` background, `an-border` border, `border-radius: 8px`, `padding: 24px`

| Feature | Icon | Headline | Body |
|---|---|---|---|
| AI Analysis | `Brain` (20px) | "AI-powered analysis" | "Ask plain-language questions about any clause, term, or obligation." |
| Session History | `History` (20px) | "Full session history" | "Every conversation is saved. Return to any analysis at any time." |
| Document Preview | `FileText` (20px) | "Inline document preview" | "Upload a PDF or DOCX and preview it alongside your chat." |

- Icon: `an-accent` color, 20px, stroke 1.5px
- Feature headline: 16px/500, `an-fg-base`
- Feature body: 14px, `an-fg-subtle`, line-height 1.6

### Section 3 — Disclaimer
- Full-width, `an-bg-subtle` background, centered text
- Text: "AI-generated analysis is for informational purposes only. Always consult a qualified legal professional before acting on any analysis."
- Font: 13px, `an-fg-muted`
- Padding: 24px

---

## Components

| Component / Element | Notes |
|---|---|
| `app/landing/page.tsx` | Full page — no shared shell, no sidebar |
| `app/page.tsx` | Root redirect logic (checks localStorage, redirects) |

No reusable components needed — the landing page is self-contained.

---

## Design

- Background: `an-bg-base` (light: `#FAF9F7`)
- No sidebar, no top nav bar, no RightPanel
- Max content width: 960px, centered with `mx-auto`
- Internal section padding: 80px top/bottom for hero, 64px for features, 32px for disclaimer
- Feature grid: `gap: 24px`, 3 equal columns on desktop

---

## Edge Cases

| Scenario | Handling |
|---|---|
| User is already logged in (visits `/`) | Redirect to `/dashboard` |
| User is not logged in (visits `/`) | Redirect to `/landing` |
| User is not logged in (visits `/landing` directly) | Page renders normally — no redirect |
| User is logged in (visits `/landing` directly) | Page renders — no forced redirect from the landing page itself |
