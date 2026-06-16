# Feedback Spec

## Feature Name
Session Feedback Widget

## Description
A 1–5 star rating widget with an optional comment textarea that appears below every assistant message. The user can submit one rating per assistant message. After submission, the widget collapses to a "Thanks!" confirmation. Feedback is persisted to the `feedback` table in Supabase via `POST /api/feedback`.

---

## User Flow

1. Assistant message renders in the chat
2. FeedbackWidget appears immediately below it
3. User clicks a star (1–5) → comment textarea reveals below the stars
4. User optionally types a comment
5. User clicks Submit
6. Widget collapses to: "Thanks for your feedback!" (13px `an-fg-muted`)
7. One submission per assistant message — widget does not re-appear after submit

---

## Widget Behaviour

- Appears below every assistant message bubble
- 5 star icons (Lucide `Star`, 16px, 1.5px stroke)
  - Default: empty/outline, `an-fg-muted` color
  - Hovered: filled, `an-warning` color
  - Selected and below: filled, `an-accent` color
- Selecting any star immediately reveals the comment textarea
- Comment textarea: standard input styling, 80px height, resize: none, placeholder "Add a comment (optional)"
- Submit button: primary accent, 13px, 28px height, full width of widget
- Widget max-width: matches assistant bubble max-width (680px)
- Submitted state: collapses to single line "Thanks for your feedback!" — no stars, no form

---

## State in FeedbackWidget

Owned by the widget itself (does not need to live in ChatArea):

```ts
const [selectedRating, setSelectedRating] = useState<number | null>(null)
const [hoveredRating, setHoveredRating] = useState<number | null>(null)
const [comment, setComment] = useState('')
const [submitted, setSubmitted] = useState(false)
const [isSubmitting, setIsSubmitting] = useState(false)
```

One widget instance per assistant message. Once `submitted = true`, the widget stays collapsed for the lifetime of the session.

---

## API Route

### `POST /api/feedback`

**Request body:**
```ts
{
  sessionId: string
  userId: string       // from localStorage
  rating: number       // 1–5
  comment?: string     // optional, may be empty string
}
```

**Responses:**
| Status | Body | Condition |
|---|---|---|
| 201 | `{ id, session_id, rating, comment, created_at }` | Feedback saved |
| 400 | `{ error: 'Missing required fields' }` | sessionId, userId, or rating missing |
| 400 | `{ error: 'Rating must be between 1 and 5' }` | rating out of range |
| 500 | `{ error: 'Server error' }` | Unexpected failure |

---

## DB Schema

See `specs/database.md` — `feedback` table.

Key points:
- `rating`: INTEGER, CHECK `>= 1 AND <= 5`
- `comment`: nullable TEXT
- `user_id` and `session_id`: both FK with cascade delete
- One row per submission — no enforced unique constraint per message, but the widget UI prevents re-submission

---

## Component Interface

```ts
interface FeedbackWidgetProps {
  sessionId: string
  userId: string       // from localStorage, passed down from ChatArea
}
```

The widget handles its own API call internally. ChatArea does not need to know about the result.

---

## Design

- Container: no background, no border — appears as an extension of the assistant message area
- Star row: 5 stars, `gap: 4px`, cursor pointer
- Star size: 16px, stroke 1.5px
- Comment textarea: standard input styling
- Submit button: primary accent, full width of the widget container, 28px height
- Submitted state: "Thanks for your feedback!" in `an-fg-muted`, 13px
- `transition duration-150` on star hover fill

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Submit with no comment | Allowed — `comment` is optional |
| Submit fails (network/server error) | Show inline error: "Failed to submit. Please try again." — widget stays open |
| User submits then reopens session | Widget renders in collapsed "Thanks!" state if `submitted = true` in local React state; on hard reload the widget resets (no persisted submitted state in Supabase) |
| Multiple assistant messages in one session | Each message gets its own FeedbackWidget instance with independent state |
| No star selected, Submit clicked | Submit button disabled until a star is selected |
