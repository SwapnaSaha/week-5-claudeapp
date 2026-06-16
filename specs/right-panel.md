# Right Panel Spec

## Feature Name
Right Panel — Execution Steps and Document Preview

## Description
The RightPanel is the 304px fixed-width panel on the right side of the 3-panel app shell. It has two sections: an execution steps tracker (always visible) that updates in real time during an API call lifecycle, and a document preview section (shown only when a file is attached). State is owned by `ChatArea` and passed as props; `RightPanel` is a presentational component.

---

## Layout

```
┌─────────────────────┐
│  Execution Steps    │  Always visible
│  (5 steps)          │
├─────────────────────┤
│  Document Preview   │  Shown when file attached
│  (PDF or DOCX text) │
└─────────────────────┘
```

Width: 304px. Background: `an-bg-subtle`. Full viewport height. Border-left: `1px solid an-border`.

---

## Execution Steps Section

Always visible. Shows a 5-step progress tracker updated during the `POST /api/chat` lifecycle.

| Step # | Label | Trigger |
|---|---|---|
| 1 | Parsing document | File attached / parse started |
| 2 | Sending to Azure AI | API request initiated |
| 3 | Waiting for response | Azure thread run started, polling |
| 4 | Processing response | Run completed, retrieving message |
| 5 | Completed / Error | API call finished |

### Step State Values

| Status | Icon | Badge style |
|---|---|---|
| `idle` | `Circle` (16px, muted) | Neutral (`an-bg-surface` bg, `an-fg-muted` text) |
| `active` | `Loader2` spinning (16px, accent) | Active (`an-accent-subtle` bg, `an-accent` text) |
| `completed` | `CheckCircle2` (16px, success) | Success (`an-success` tinted bg, `an-success` text) |
| `error` | `AlertCircle` (16px, error) | Error (`an-error` tinted bg, `an-error` text) |

### Step Row Layout
Each step row: icon + label + status badge (right-aligned).
Height: 36px. Padding: `0 16px`. Font: 13px `an-fg-subtle` (label), 11px badge.

### State in ChatArea

```ts
type ExecutionStep = {
  id: number
  label: string
  status: 'idle' | 'active' | 'completed' | 'error'
}
```

Initial state: all 5 steps with `status: 'idle'`.

Updates during API lifecycle:
- File selected → step 1 → `active` → then `completed`
- `POST /api/chat` called → step 2 → `active`
- Thread run started → step 2 → `completed`, step 3 → `active`
- Poll loop running → step 3 stays `active`
- Run completed → step 3 → `completed`, step 4 → `active`
- Message retrieved → step 4 → `completed`, step 5 → `active`
- API returns success → step 5 → `completed`
- API returns error → current active step → `error`, step 5 → `error`
- New message sent → reset all steps to `idle`

---

## Document Preview Section

Shown only when `blobUrl` or `contractText` is non-empty (i.e., a file has been attached).

### PDF Preview
- Render: `<iframe src={blobUrl} className="w-full h-full border-0" />`
- Title bar at top of preview section: filename (`contractName`), 13px, truncated
- The iframe takes the remaining height of the panel below the steps section
- When file is dismissed: blob URL is revoked (`URL.revokeObjectURL(blobUrl)`), preview section disappears

### DOCX Preview
- Render: scrollable `<pre>` with `font-mono` (JetBrains Mono 13px)
- Text: `contractText` truncated to 4,000 chars; append `"… (preview truncated)"` if truncated
- Background: `an-bg-surface`, padding: 12px, overflow-y: auto
- Title bar same as PDF

### Empty State (no file attached)
- Show: "No document attached" in `an-fg-muted`, 13px, centered vertically in the preview area

---

## Component Interface

```ts
type ExecutionStep = {
  id: number
  label: string
  status: 'idle' | 'active' | 'completed' | 'error'
}

type FilePreview = {
  name: string        // filename for header
  blobUrl: string     // non-empty for PDFs
  text: string        // non-empty for DOCX
  fileType: string    // MIME type to choose renderer
}

interface RightPanelProps {
  executionSteps: ExecutionStep[]
  filePreview: FilePreview | null
}
```

`RightPanel` owns no state — it is entirely driven by props from `ChatArea`.

---

## Design

- Panel background: `an-bg-subtle`
- Section divider: `1px solid an-border`
- Section header: 12px `an-fg-muted` uppercase tracking-wide, 16px padding
- Step icon size: 16px, stroke 1.5px
- Step label: 13px `an-fg-subtle`
- Badge: 11px/500, `border-radius: 10px`, `padding: 0 8px`, `height: 20px`

---

## Edge Cases

| Scenario | Handling |
|---|---|
| No file attached | Preview section shows empty state — does not collapse the panel |
| File dismissed mid-chat | Revoke blob URL, clear `filePreview` prop — steps section remains visible |
| API error on step 3 | Step 3 → error, step 5 → error; steps stay visible until next send |
| Second message sent | Reset all steps to `idle` before starting new lifecycle |
| DOCX text > 4,000 chars | Truncate with notice — do not render full text to avoid DOM performance issues |
