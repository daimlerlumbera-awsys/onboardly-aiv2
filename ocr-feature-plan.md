# OCR Feature Plan

## Top-Level Overview

Add an OCR pipeline to OnBoardly so that when an employee submits a government-issued ID document, the server automatically extracts key identity fields using an on-premise vision model (`mimo-v2.6-distill-qwen-9b` at `http://192.168.97.31:1234`). The extracted data is stored in a new `employee_ocr_profiles` table. HR can then review, optionally correct via a notes field, and approve or reject the OCR result. Approved OCR profiles become the canonical employee identity record.

**Scope:**
- Add real multipart file upload (replaces the URL-paste flow).
- Auto-trigger OCR after file submission on requirement items.
- New DB table: `employee_ocr_profiles`.
- New server routes: file upload, OCR trigger, OCR profile CRUD.
- New UI: HR OCR review panel on Employee Detail page; employee-facing upload button on My Requirements page.

**Out of scope:**
- Cloud storage — files are saved to a local `uploads/` folder served statically.
- Batch/retroactive OCR on existing records.
- Per-field approval granularity (HR approves/rejects the whole extracted set).

---

## Sub-Tasks

---

### Sub-Task 1 — Add File Upload Infrastructure to the Server

**Status:** `[x] done`

**Intent:**
Replace the current "paste a URL" flow with actual multipart file upload. The server needs a static file-serving route and a multer-based upload endpoint so requirement files are real server-hosted files.

**Expected Outcomes:**
- `uploads/` directory created at `apps/server/uploads/`.
- `multer` installed as a server dependency.
- `POST /api/upload` endpoint accepts a single `file` field and returns `{ fileUrl: string }`.
- `GET /uploads/:filename` serves static files from that directory.
- `.gitignore` updated to exclude `uploads/` content but keep the folder.

**Todo List:**
1. Install `multer` and `@types/multer` in `apps/server`.
2. Create `apps/server/uploads/.gitkeep` (empty placeholder).
3. Add `uploads/` to `apps/server/.gitignore`.
4. Create `apps/server/src/routes/upload.ts` — multer middleware with file-type filter (images + PDF), size limit 10 MB, destination `uploads/`, returns `{ fileUrl }` as a relative server URL.
5. Mount the upload router and static middleware in `apps/server/src/index.ts`.

**Relevant Context:**
- `apps/server/src/index.ts` — where routers are mounted.
- `apps/server/package.json` — add `multer` here.
- Middleware pattern matches existing auth middleware in `apps/server/src/middleware/`.

---

### Sub-Task 2 — Add `employee_ocr_profiles` Table (DB Schema + Migration)

**Status:** `[x] done`

**Intent:**
Create a new table to hold OCR-extracted identity data, linked to `employees.id`. Each row captures the raw extraction plus a review status so HR can approve or reject it.

**Expected Outcomes:**
- New `employeeOcrProfiles` table in `apps/server/src/db/schema.ts`.
- A Drizzle migration SQL file generated and applied.
- Shared types updated to include `EmployeeOcrProfile`.

**Fields:**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | auto |
| `employee_id` | uuid FK → employees.id | cascade delete |
| `requirement_id` | uuid FK → employee_requirements.id | which document triggered it |
| `full_name` | text | OCR extracted |
| `date_of_birth` | text | OCR extracted (raw string) |
| `id_number` | text | ID / passport number |
| `nationality` | text | OCR extracted |
| `address` | text | OCR extracted |
| `expiry_date` | text | OCR extracted |
| `document_type` | text | e.g. "passport", "national_id" |
| `raw_ocr_text` | text | full raw model output |
| `status` | text | `pending_review` / `approved` / `rejected` |
| `hr_notes` | text | HR correction notes |
| `extracted_at` | timestamptz | when OCR ran |
| `reviewed_at` | timestamptz | when HR acted |

**Todo List:**
1. Add `employeeOcrProfiles` table definition to `apps/server/src/db/schema.ts`.
2. Run `npm run db:generate` in `apps/server` to produce the migration SQL.
3. Run `npm run db:migrate` to apply the migration.
4. Add `EmployeeOcrProfile` interface to `packages/shared/src/types.ts`.
5. Export the new type from `packages/shared/src/index.ts`.

**Relevant Context:**
- `apps/server/src/db/schema.ts` — existing table definitions to follow.
- `packages/shared/src/types.ts` — existing shared types.

---

### Sub-Task 3 — OCR Service Module (On-Premise LLM Integration)

**Status:** `[x] done`

**Intent:**
Create a self-contained server-side module that reads a local file, sends it to the on-premise vision model, and parses the JSON response into structured identity fields. No external API key is used — only the base URL.

**Expected Outcomes:**
- `apps/server/src/services/ocr.ts` exported function `runOcr(filePath: string): Promise<OcrResult>`.
- Calls `http://192.168.97.31:1234/v1/chat/completions` with model `mimo-v2.6-distill-qwen-9b`, base64-encoded image payload.
- Returns a typed `OcrResult` object with all six identity fields plus `rawText`.
- Gracefully returns partial/empty fields when extraction is uncertain rather than throwing.

**Todo List:**
1. Create `apps/server/src/services/ocr.ts`.
2. Read the file from disk and base64-encode it.
3. Build the OpenAI-compatible chat completion request with a structured extraction prompt instructing the model to return JSON with keys: `full_name`, `date_of_birth`, `id_number`, `nationality`, `address`, `expiry_date`, `document_type`.
4. POST to `http://192.168.97.31:1234/v1/chat/completions` using `node-fetch` or the native `fetch` (Node 18+).
5. Parse the model's response content as JSON; fall back to empty strings on parse failure while preserving `rawText`.
6. Export `OcrResult` type (mirrors the DB columns).

**Relevant Context:**
- The model follows the OpenAI chat completions API format (base URL only, no API key header needed).
- Files are stored in `apps/server/uploads/` after Sub-Task 1.
- Node 18+ is available (`tsx` runner is already in use), so native `fetch` is fine.

---

### Sub-Task 4 — OCR Route: Auto-Trigger After File Submission

**Status:** `[x] done`

**Intent:**
When an employee submits a file to a requirement, the server should automatically invoke the OCR service and persist the result into `employee_ocr_profiles`. This keeps the trigger invisible to the employee and requires no extra UI step for triggering.

**Expected Outcomes:**
- `PATCH /api/requirements/:reqId/file` (existing) calls `runOcr` after saving the file, then inserts a row into `employee_ocr_profiles` with `status = 'pending_review'`.
- If OCR fails, the file submission still succeeds — OCR errors are logged but not surfaced to the employee.
- New route `GET /api/employees/:id/ocr-profile` returns the OCR profile(s) for that employee (HR only).
- New route `PATCH /api/ocr-profiles/:ocrId/review` accepts `{ status: 'approved'|'rejected', hrNotes?: string }` (HR only).

**Todo List:**
1. Import `runOcr` and `employeeOcrProfiles` in `apps/server/src/routes/requirements.ts`.
2. After the `fileUrl` update in `PATCH /:reqId/file`, resolve the local file path from the URL, call `runOcr`, and insert into `employeeOcrProfiles` (fire-and-forget with try/catch).
3. Create `apps/server/src/routes/ocrProfiles.ts` with `GET /` (list for employee) and `PATCH /:ocrId/review` (HR review).
4. Mount the new router in `apps/server/src/index.ts` at `/api/employees/:id/ocr-profile` and `/api/ocr-profiles`.

**Relevant Context:**
- `apps/server/src/routes/requirements.ts` lines 121–166 — the file submission handler to modify.
- `apps/server/src/index.ts` — router mounting.
- OCR should be non-blocking; the employee's response must not be delayed by model inference time.

---

### Sub-Task 5 — Update Frontend: Real File Upload on My Requirements Page

**Status:** `[x] done`

**Intent:**
Replace the URL-paste input in the employee-facing `RequirementChecklist` with a real `<input type="file">` that uploads to `POST /api/upload` first, then submits the returned URL to the existing `PATCH /api/requirements/:reqId/file` endpoint.

**Expected Outcomes:**
- `RequirementChecklist` in `employee` mode shows a file picker instead of a URL text input.
- Upload progress is indicated (button disabled + spinner while uploading).
- The two-step flow (upload → submit URL) is handled inside the component or a helper hook; the parent API is unchanged.
- PDF and image files are accepted; other types are rejected client-side.

**Todo List:**
1. Replace `FileSubmitForm` in `apps/web/src/components/employees/RequirementChecklist.tsx` with a `FileUploadForm` that uses `<input type="file" accept="image/*,.pdf">`.
2. On file selection, POST `FormData` to `${API_BASE}/api/upload` and get back `{ fileUrl }`.
3. Then call `onSubmitFile(item, fileUrl)` with the returned URL (no change to parent mutation logic).
4. Show upload/submit loading states clearly.

**Relevant Context:**
- `apps/web/src/components/employees/RequirementChecklist.tsx` lines 82–118 — `FileSubmitForm` to replace.
- `apps/web/src/pages/MyRequirementsPage.tsx` — parent that calls `submitFileMutation`; no changes needed there.

---

### Sub-Task 6 — HR OCR Review Panel on Employee Detail Page

**Status:** `[x] done`

**Intent:**
Give HR a dedicated section on the Employee Detail page to view OCR-extracted identity data, see the raw text, and approve or reject the result with optional notes.

**Expected Outcomes:**
- New "Identity Documents (OCR)" section card on `EmployeeDetailPage` visible only to HR.
- Displays extracted fields in a read-only table.
- Shows `rawText` in a collapsible `<details>` block.
- Approve / Reject buttons with a notes text area (similar to the existing requirement approve/reject pattern).
- On approve/reject, calls `PATCH /api/ocr-profiles/:ocrId/review` and invalidates the query.
- Badge shows current OCR profile status (`pending_review`, `approved`, `rejected`).

**Todo List:**
1. Add `useQuery` for `GET /api/employees/:id/ocr-profile` in `apps/web/src/pages/EmployeeDetailPage.tsx`.
2. Add `OcrReviewCard` section (or inline section) rendering the extracted fields and status badge.
3. Add `useMutation` for `PATCH /api/ocr-profiles/:ocrId/review`.
4. Wire up Approve / Reject UI with a `hrNotes` textarea (same UX pattern as requirement rejection).
5. Add `EmployeeOcrProfile` to `@onboardly/shared` imports where needed.

**Relevant Context:**
- `apps/web/src/pages/EmployeeDetailPage.tsx` lines 42–55 — `SectionCard` component to reuse.
- `apps/web/src/components/employees/RequirementChecklist.tsx` — existing approve/reject UX pattern to mirror.
- `packages/shared/src/types.ts` — `EmployeeOcrProfile` added in Sub-Task 2.

---

## Implementation Order

```
Sub-Task 1  →  Sub-Task 2  →  Sub-Task 3  →  Sub-Task 4  →  Sub-Task 5  →  Sub-Task 6
(upload)       (schema)        (OCR svc)       (auto-trigger)  (employee UI)  (HR UI)
```

Each sub-task is independently reviewable and deployable. Sub-Tasks 1–4 are pure backend; Sub-Tasks 5–6 are frontend.

---

## Environment Variable to Add

Add to `apps/server/.env.example`:
```
OCR_BASE_URL=http://192.168.97.31:1234
OCR_MODEL=mimo-v2.6-distill-qwen-9b
```
