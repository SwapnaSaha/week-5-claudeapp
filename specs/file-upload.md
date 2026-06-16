# File Upload Spec

## Feature Name
File Upload and Parsing

## Description
Users attach PDF or DOCX files for contract analysis. Parsing happens client-side in the browser. Extracted text is stored in `ChatArea` component state and sent as `contractText` with every API call. The raw file is never uploaded to the server or persisted — it is session-only. A blob URL is created for preview in the RightPanel and revoked when the file is dismissed. Max file size: 10 MB.

---

## User Flow

1. User clicks the paperclip icon in the Composer
2. Hidden `<input type="file">` opens with accept `.pdf,.docx`
3. User selects a file
4. Client validates: file extension and MIME type must be `.pdf` or `.docx`; size must be ≤ 10 MB
5. If validation fails: inline error shown, no further action
6. If valid: file is parsed client-side
7. A blob URL is created for preview (PDF) or the text is rendered directly (DOCX)
8. `onFileLoaded(text, name, blobUrl, fileType)` is called — passes all data to ChatArea
9. Composer shows a filename chip with a dismiss (×) button
10. RightPanel shows the document preview
11. User dismisses: blob URL revoked, all file state cleared in ChatArea
12. User attaches a new file: old blob URL revoked first, then replaced

---

## How Content Reaches the Backend

Extracted text is sent as a JSON string field `contractText` in the `POST /api/chat` request body.
No file binary or base64 is sent to the server.
When no file is attached: `contractText` is an empty string (`""`).

---

## Parsing Strategy

**Client-side parsing** — the file is read and parsed entirely in the browser before anything is sent to the API.

### PDF
| Property | Value |
|---|---|
| File extension | `.pdf` |
| MIME type | `application/pdf` |
| Library | `pdfjs-dist` |
| Import | `import * as pdfjsLib from 'pdfjs-dist'` |
| Worker setup | `GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'` |
| Key method | `pdfjsLib.getDocument(arrayBuffer)` → iterate pages → `page.getTextContent()` |
| Setup required | Copy `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` → `public/pdf.worker.min.mjs` |
| next.config.mjs | Add `pdfjs-dist` to `serverComponentsExternalPackages` |
| Known gotcha | Font-loading console warnings are harmless — text extraction works regardless |

### DOCX
| Property | Value |
|---|---|
| File extension | `.docx` |
| MIME type | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Library | `mammoth` |
| Import | `import mammoth from 'mammoth'` |
| Key method | `mammoth.extractRawText({ arrayBuffer })` → `.value` is the extracted string |
| Setup required | None |

---

## Content Preview

### PDF preview
- Create blob URL before parsing: `URL.createObjectURL(file)`
- Pass blob URL through `onFileLoaded` callback
- Preview rendered in RightPanel as `<iframe src={blobUrl} />` (full-height within the preview section)
- Blob URL revoked on file dismiss: `URL.revokeObjectURL(blobUrl)`

### DOCX preview
- No blob URL needed
- Extracted text truncated at 4,000 chars with `"… (preview truncated)"` appended
- Preview rendered in RightPanel as scrollable `<pre>` with `font-mono` (JetBrains Mono 13px)

### Where the preview lives
- RightPanel (`components/RightPanel.tsx`), document preview section
- Takes up the upper portion of the panel when a file is attached
- Persists while the user continues chatting — not cleared until file is dismissed

---

## State Architecture — CRITICAL

`ChatArea` **owns** all file state. `FileUpload` is stateless.

| State | Owner | Purpose |
|---|---|---|
| `contractText` | ChatArea | Extracted text sent to API |
| `contractName` | ChatArea | Displayed in Composer chip + RightPanel header |
| `blobUrl` | ChatArea | Passed to RightPanel for PDF preview |
| `fileType` | ChatArea | Determines which preview renderer RightPanel uses |

`FileUpload` component (`components/FileUpload.tsx`):
- Renders only the hidden input and paperclip icon trigger
- Receives `onFileLoaded` callback as a prop
- Calls `onFileLoaded(text, name, blobUrl, fileType)` after parsing
- Owns NO state

**Callback signature:**
```ts
onFileLoaded(
  text: string,      // extracted content, sent to backend as contractText
  name: string,      // filename, shown in chip and preview header
  blobUrl: string,   // blob URL for PDF preview; empty string for DOCX
  fileType: string   // MIME type — used to pick preview renderer
): void
```

---

## Validation

All validation runs before parsing begins:

| Check | Error message |
|---|---|
| File extension not `.pdf` or `.docx` | "Only PDF and DOCX files are supported" |
| File size > 10 MB | "File exceeds the 10 MB size limit" |
| Parse failure | "Failed to parse the file. Please try a different file." |

Errors are shown inline below the paperclip icon area. Failed validation does not block other app functionality.

---

## API Contract
- Route: `POST /api/chat`
- Field: `contractText: string`
- Max recommended content: no explicit truncation in MVP; the full extracted text is sent
- When no file attached: `contractText: ""`

---

## Edge Cases

| Scenario | Handling |
|---|---|
| User dismisses the file | Revoke blob URL, clear `contractText`, `contractName`, `blobUrl`, `fileType` in ChatArea |
| Parse fails mid-way | Show inline error; do not block chatting without a file |
| User attaches a second file | Revoke old blob URL first, then replace all file state |
| User submits without a file | Allowed — `contractText` is empty string; Azure receives only userMessage |
| PDF with no extractable text (scanned/protected) | Parsing returns empty string; show "No text could be extracted from this PDF" |
| DOCX extractRawText returns empty | Same — show inline notice |
| File > 10 MB | Reject before reading; show size error |
| Non-PDF, non-DOCX file extension | Reject before reading; show type error |
