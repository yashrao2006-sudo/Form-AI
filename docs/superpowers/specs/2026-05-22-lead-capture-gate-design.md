# Lead Capture Gate — Design Spec
**Date:** 2026-05-22
**Status:** Approved — ready for implementation

---

## Summary

Add an optional email gate to shared forms. When enabled by the form owner, visitors must enter their email before the results section is revealed. Collected leads are viewable and downloadable from the builder.

---

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Gate style | Blur + overlay on results | Creates urgency without hiding that results exist |
| Toggle location | Separate panel below form card in builder | Keeps `FormRenderer` unchanged; clean separation |
| Leads access | Panel in builder (list + CSV download) | Owner is already on the builder page; zero-friction |
| Gate persistence | Once per device via localStorage | Reduces friction for returning visitors |
| Flag storage | Schema-embedded (`leadCapture.enabled`) | Reuses existing PUT API; no new DB column on `forms` |

---

## Architecture

Four moving parts:

1. **Type change** — `FormSchema` gets `leadCapture?: { enabled: boolean }`
2. **New `leads` table** — stores collected emails per form
3. **Two new API routes** — `POST /api/leads` (visitor submits email) and `GET /api/leads/[formId]` (builder fetches leads)
4. **Two new components** — `LeadGate` (shared form overlay) and `LeadCapturePanel` (builder controls)

The embed page (`/embed/[id]`) has no gate — embeds are for passive use, not lead collection.

---

## Data Model

### `lib/types.ts`

```ts
export interface FormSchema {
  title: string
  inputs: InputField[]
  outputs: OutputField[]
  leadCapture?: { enabled: boolean }  // new
}
```

### Migration `supabase/migrations/002_create_leads.sql`

```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  email text not null,
  captured_at timestamptz not null default now()
);
create index leads_form_id_idx on leads(form_id);
```

`on delete cascade` — leads are deleted if their form is deleted. Index on `form_id` keeps the GET query fast.

---

## API

### `POST /api/leads`
- **Body:** `{ form_id: string, email: string }`
- **Validates:** email format (regex) + form exists
- **Response:** `201 { id, email, captured_at }` or `400`/`404` on error
- **Note:** No deduplication — same visitor submitting twice creates a second row. Rare in practice due to localStorage gate.

### `GET /api/leads/[formId]`
- **Response:** `{ leads: { email: string, captured_at: string }[] }` ordered by `captured_at desc`
- **Auth:** None — security by obscurity (form ID required, same as builder access)

CSV download is client-side — `LeadCapturePanel` generates the file from the fetched array. No extra route needed.

---

## Components

### `LeadGate` (new, `components/LeadGate.tsx`)
Client component. Wraps the outputs section on the shared form.

- **Props:** `formId: string`, `children: ReactNode`
- **On mount:** checks `localStorage` for `lc_bypass_[formId]` — if found, renders `children` directly
- **Gated state:** renders `children` with `filter: blur(6px); pointer-events: none` + email overlay on top
- **On submit:** validates email client-side → `POST /api/leads` → writes `lc_bypass_[formId]` to localStorage → clears gate and shows results
- **Loading state:** button shows spinner during POST

### `LeadCapturePanel` (new, `components/LeadCapturePanel.tsx`)
Client component. Appears below `FormRenderer` in the builder when a form is saved.

- **Props:** `formId: string`, `schema: FormSchema`, `onSchemaUpdate: (s: FormSchema) => void`
- **Toggle:** calls `onSchemaUpdate` with `leadCapture.enabled` flipped — builder's existing debounced save handles the PUT to `/api/forms/[id]`
- **When enabled:** fetches `GET /api/leads/[formId]`, renders email list with timestamps
- **CSV download:** generates `leads.csv` client-side from fetched array (email, captured_at columns)
- **Empty state:** "No leads yet — share your form to start collecting"

### `FormRenderer` changes (`components/FormRenderer.tsx`)
- Add `leadCaptureEnabled?: boolean` prop
- Wrap the outputs `<div>` in `<LeadGate formId={formId}>` when `leadCaptureEnabled && formId`

### `app/page.tsx` changes
- Render `<LeadCapturePanel>` below `<FormRenderer>` when `formId != null`, passing `schema` and `handleSchemaUpdate`

### `app/f/[id]/page.tsx` changes
- Pass `leadCaptureEnabled={!!form.schema.leadCapture?.enabled}` to `FormRenderer`

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Form not yet saved in builder | `LeadCapturePanel` not rendered (same condition as `ShareButton`) |
| Toggle off with existing leads | Leads stay in DB; gate hidden. Toggling back on resumes collection |
| Invalid email | Client-side regex check before POST; API also validates |
| Embed page | No gate; `leadCaptureEnabled` not passed to `/embed/[id]` |
| Builder preview | No gate; `leadCaptureEnabled` not passed to builder's `FormRenderer` |

---

## File Map

```
New files:
  components/LeadGate.tsx
  components/LeadCapturePanel.tsx
  app/api/leads/route.ts
  app/api/leads/[formId]/route.ts
  supabase/migrations/002_create_leads.sql

Modified files:
  lib/types.ts                     — add leadCapture to FormSchema
  components/FormRenderer.tsx      — add leadCaptureEnabled prop, wrap outputs in LeadGate
  app/page.tsx                     — render LeadCapturePanel below FormRenderer
  app/f/[id]/page.tsx              — pass leadCaptureEnabled to FormRenderer
```
