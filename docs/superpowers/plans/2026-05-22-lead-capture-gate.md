# Lead Capture Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional email gate to shared forms — visitors enter their email to unlock blurred results; the form owner sees collected leads and can download CSV from the builder.

**Architecture:** `leadCapture.enabled` stored inside the existing `FormSchema` JSON (no new column on `forms`). A new `leads` Supabase table stores collected emails. Two API routes handle lead creation and retrieval. `LeadGate` wraps the outputs card on shared forms; `LeadCapturePanel` is a separate card below the form in the builder.

**Tech Stack:** Next.js 16.2.2 (App Router), TypeScript, Tailwind CSS, Supabase (`supabaseAdmin`), Vitest + jsdom.

---

## File Map

**New files:**
- `supabase/migrations/002_create_leads.sql`
- `app/api/leads/route.ts` — `POST /api/leads`
- `app/api/leads/[formId]/route.ts` — `GET /api/leads/[formId]`
- `components/LeadGate.tsx`
- `components/LeadCapturePanel.tsx`
- `tests/api/leads.test.ts`

**Modified files:**
- `lib/types.ts` — add `leadCapture?: { enabled: boolean }` to `FormSchema`
- `components/FormRenderer.tsx` — add `leadCaptureEnabled` prop, wrap outputs in `LeadGate`
- `app/f/[id]/page.tsx` — pass `leadCaptureEnabled` to `FormRenderer`
- `app/page.tsx` — render `LeadCapturePanel` below `FormRenderer`

---

## Task 1: Types + DB Migration

**Files:**
- Modify: `lib/types.ts`
- Create: `supabase/migrations/002_create_leads.sql`

- [ ] **Step 1: Update FormSchema type**

Replace the entire contents of `lib/types.ts`:

```ts
export type InputType = 'currency' | 'number' | 'percent'
export type OutputFormat = 'currency' | 'percent' | 'number'

export interface InputField {
  id: string
  label: string
  type: InputType
}

export interface OutputField {
  label: string
  formula: string
  format: OutputFormat
}

export interface FormSchema {
  title: string
  inputs: InputField[]
  outputs: OutputField[]
  leadCapture?: { enabled: boolean }
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface Form {
  id: string
  schema: FormSchema
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Create migration file**

Create `supabase/migrations/002_create_leads.sql`:

```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  email text not null,
  captured_at timestamptz not null default now()
);
create index leads_form_id_idx on leads(form_id);
```

- [ ] **Step 3: Run migration in Supabase**

Go to https://supabase.com/dashboard/project/lnbsaefrdbbrindtstka → SQL Editor → paste the SQL above → Run.

Verify: open Table Editor, confirm `leads` table exists with columns `id`, `form_id`, `email`, `captured_at`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts supabase/migrations/002_create_leads.sql
git commit -m "feat: add leadCapture to FormSchema, add leads table migration"
```

---

## Task 2: POST /api/leads

**Files:**
- Create: `app/api/leads/route.ts`
- Create: `tests/api/leads.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/api/leads.test.ts`:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { POST } from '@/app/api/leads/route'
import { supabaseAdmin } from '@/lib/supabase'

function mockFromSequence(...calls: { data: unknown; error: unknown }[]) {
  let i = 0
  vi.mocked(supabaseAdmin.from).mockImplementation(() => {
    const result = calls[i++] ?? { data: null, error: { message: 'unexpected call' } }
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(result),
      order: vi.fn().mockResolvedValue(result),
    } as any
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/leads', () => {
  it('creates a lead and returns 201', async () => {
    mockFromSequence(
      { data: { id: 'form-1' }, error: null },
      { data: { id: 'lead-1', form_id: 'form-1', email: 'a@b.com', captured_at: '2026-05-22T00:00:00Z' }, error: null }
    )
    const req = new Request('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify({ form_id: 'form-1', email: 'a@b.com' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.email).toBe('a@b.com')
  })

  it('returns 400 when form_id is missing', async () => {
    const req = new Request('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid email', async () => {
    const req = new Request('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify({ form_id: 'form-1', email: 'notanemail' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when form does not exist', async () => {
    mockFromSequence({ data: null, error: { message: 'Not found' } })
    const req = new Request('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify({ form_id: 'missing', email: 'a@b.com' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 500 when insert fails', async () => {
    mockFromSequence(
      { data: { id: 'form-1' }, error: null },
      { data: null, error: { message: 'db error' } }
    )
    const req = new Request('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify({ form_id: 'form-1', email: 'a@b.com' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run tests/api/leads.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/leads/route'`

- [ ] **Step 3: Implement POST /api/leads**

Create `app/api/leads/route.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const body = await request.json()
  const { form_id, email } = body

  if (!form_id || typeof form_id !== 'string') {
    return Response.json({ error: 'form_id required' }, { status: 400 })
  }
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return Response.json({ error: 'Invalid email' }, { status: 400 })
  }

  const { data: form, error: formError } = await supabaseAdmin
    .from('forms')
    .select('id')
    .eq('id', form_id)
    .single()

  if (formError || !form) {
    return Response.json({ error: 'Form not found' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert([{ form_id, email }])
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run tests/api/leads.test.ts
```

Expected: 5 tests pass under `POST /api/leads`.

- [ ] **Step 5: Commit**

```bash
git add app/api/leads/route.ts tests/api/leads.test.ts
git commit -m "feat: add POST /api/leads route with tests"
```

---

## Task 3: GET /api/leads/[formId]

**Files:**
- Create: `app/api/leads/[formId]/route.ts`
- Modify: `tests/api/leads.test.ts`

- [ ] **Step 1: Add import and failing GET tests**

In `tests/api/leads.test.ts`, add the GET import alongside the existing POST import at the top:

```ts
import { POST } from '@/app/api/leads/route'
import { GET } from '@/app/api/leads/[formId]/route'  // add this line
```

Then append this block at the end of the file:

```ts
describe('GET /api/leads/[formId]', () => {
  it('returns 200 with leads array', async () => {
    mockFromSequence({
      data: [
        { email: 'a@b.com', captured_at: '2026-05-22T00:00:00Z' },
        { email: 'c@d.com', captured_at: '2026-05-21T00:00:00Z' },
      ],
      error: null,
    })
    const req = new Request('http://localhost/api/leads/form-1')
    const res = await GET(req, { params: Promise.resolve({ formId: 'form-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leads).toHaveLength(2)
    expect(body.leads[0].email).toBe('a@b.com')
  })

  it('returns empty array when no leads exist', async () => {
    mockFromSequence({ data: [], error: null })
    const req = new Request('http://localhost/api/leads/form-empty')
    const res = await GET(req, { params: Promise.resolve({ formId: 'form-empty' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leads).toEqual([])
  })

  it('returns 500 when Supabase errors', async () => {
    mockFromSequence({ data: null, error: { message: 'db error' } })
    const req = new Request('http://localhost/api/leads/form-1')
    const res = await GET(req, { params: Promise.resolve({ formId: 'form-1' }) })
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run tests — verify GET tests fail**

```bash
npx vitest run tests/api/leads.test.ts
```

Expected: 5 POST tests pass; 3 GET tests FAIL — `Cannot find module '@/app/api/leads/[formId]/route'`

- [ ] **Step 3: Implement GET /api/leads/[formId]**

Create `app/api/leads/[formId]/route.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params

  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('email, captured_at')
    .eq('form_id', formId)
    .order('captured_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ leads: data ?? [] })
}
```

- [ ] **Step 4: Run full test suite — verify everything passes**

```bash
npm test
```

Expected: all tests pass (evaluator + forms API + leads API — 8 leads tests total).

- [ ] **Step 5: Commit**

```bash
git add app/api/leads/[formId]/route.ts tests/api/leads.test.ts
git commit -m "feat: add GET /api/leads/[formId] route with tests"
```

---

## Task 4: LeadGate component

**Files:**
- Create: `components/LeadGate.tsx`

- [ ] **Step 1: Create LeadGate**

Create `components/LeadGate.tsx`:

```tsx
'use client'

import { useState, useEffect, type ReactNode } from 'react'

interface LeadGateProps {
  formId: string
  children: ReactNode
  wrapperClassName: string
  wrapperStyle?: React.CSSProperties
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LeadGate({ formId, children, wrapperClassName, wrapperStyle }: LeadGateProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (localStorage.getItem(`lc_bypass_${formId}`)) setOpen(true)
  }, [formId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_id: formId, email }),
      })
      if (!res.ok) throw new Error()
      localStorage.setItem(`lc_bypass_${formId}`, '1')
      setOpen(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (open) {
    return (
      <div className={wrapperClassName} style={wrapperStyle}>
        {children}
      </div>
    )
  }

  return (
    <div className={wrapperClassName} style={{ ...wrapperStyle, position: 'relative' }}>
      {/* Blurred results */}
      <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>

      {/* Email overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(79, 70, 229, 0.88)',
          borderRadius: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          gap: '8px',
        }}
      >
        <p
          style={{
            color: '#fff',
            fontWeight: 600,
            fontSize: '14px',
            textAlign: 'center',
            margin: 0,
          }}
        >
          Enter your email to see results
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: '100%',
            maxWidth: '240px',
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            autoFocus
          />
          {error && (
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', margin: 0 }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#fff',
              color: '#4f46e5',
              fontWeight: 700,
              fontSize: '13px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Saving…' : 'See My Results →'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/LeadGate.tsx
git commit -m "feat: add LeadGate component"
```

---

## Task 5: Wire LeadGate into FormRenderer and shared form page

**Files:**
- Modify: `components/FormRenderer.tsx`
- Modify: `app/f/[id]/page.tsx`

- [ ] **Step 1: Update FormRenderer**

In `components/FormRenderer.tsx`:

**a)** Add `import LeadGate from './LeadGate'` after the existing `import ShareButton from './ShareButton'` line.

**b)** Update `FormRendererProps` to add `leadCaptureEnabled`:

```tsx
interface FormRendererProps {
  schema: FormSchema
  formId?: string
  showShare?: boolean
  leadCaptureEnabled?: boolean
}
```

**c)** Update the function signature:

```tsx
export default function FormRenderer({
  schema,
  formId,
  showShare = true,
  leadCaptureEnabled = false,
}: FormRendererProps) {
```

**d)** Inside the function body, before the `return` statement, extract the outputs inner content into a variable (insert this after the `hasValues` line):

```tsx
  const outputsBody = (
    <>
      <div
        className="px-6 pt-5 pb-1 text-xs font-bold uppercase tracking-[0.18em]"
        style={{ color: 'var(--form-accent-muted)' }}
      >
        Results
      </div>
      {schema.outputs.map((out, i) => {
        const value = evaluateFormula(out.formula, nums)
        return (
          <div
            key={i}
            className="flex items-center justify-between px-6 py-4"
            style={{
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}
          >
            <span
              className="text-sm font-medium"
              style={{ color: 'rgba(255,255,255,0.75)' }}
            >
              {out.label}
            </span>
            <span
              className="text-xl font-bold tabular-nums transition-all duration-150"
              style={{ color: '#ffffff', opacity: hasValues ? 1 : 0.35 }}
            >
              {formatValue(value, out.format)}
            </span>
          </div>
        )
      })}
    </>
  )
```

**e)** Replace the existing outputs section (`{schema.outputs.length > 0 && (...)}` block) with:

```tsx
      {schema.outputs.length > 0 && (
        leadCaptureEnabled && formId ? (
          <LeadGate
            formId={formId}
            wrapperClassName="mx-5 mb-5 rounded-xl overflow-hidden"
            wrapperStyle={{ background: 'var(--form-accent)' }}
          >
            {outputsBody}
          </LeadGate>
        ) : (
          <div className="mx-5 mb-5 rounded-xl overflow-hidden" style={{ background: 'var(--form-accent)' }}>
            {outputsBody}
          </div>
        )
      )}
```

- [ ] **Step 2: Update shared form page**

In `app/f/[id]/page.tsx`, update the `<FormRenderer ... />` call to:

```tsx
        <FormRenderer
          schema={form.schema}
          formId={id}
          showShare
          leadCaptureEnabled={!!form.schema.leadCapture?.enabled}
        />
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke test the gate**

Run `npm run dev` if not already running.

To test the gate without building a new form, run this in Supabase SQL Editor (replace `<YOUR_FORM_ID>` with any existing form ID from the `forms` table):

```sql
update forms
set schema = schema || '{"leadCapture":{"enabled":true}}'::jsonb
where id = '<YOUR_FORM_ID>';
```

Open `/f/<YOUR_FORM_ID>`. Expected:
- Results card is blurred with "Enter your email to see results" overlay
- Enter a valid email → click "See My Results →" → results unblur
- Refresh → results show immediately (localStorage bypass active)

- [ ] **Step 5: Commit**

```bash
git add components/FormRenderer.tsx app/f/[id]/page.tsx
git commit -m "feat: wire LeadGate into FormRenderer and shared form page"
```

---

## Task 6: LeadCapturePanel component

**Files:**
- Create: `components/LeadCapturePanel.tsx`

- [ ] **Step 1: Create LeadCapturePanel**

Create `components/LeadCapturePanel.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import type { FormSchema } from '@/lib/types'

interface Lead {
  email: string
  captured_at: string
}

interface LeadCapturePanelProps {
  formId: string
  schema: FormSchema
  onSchemaUpdate: (schema: FormSchema) => void
}

export default function LeadCapturePanel({ formId, schema, onSchemaUpdate }: LeadCapturePanelProps) {
  const enabled = !!schema.leadCapture?.enabled
  const [leads, setLeads] = useState<Lead[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setLeads([])
      return
    }
    setLoadingLeads(true)
    fetch(`/api/leads/${formId}`)
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []))
      .finally(() => setLoadingLeads(false))
  }, [enabled, formId])

  function handleToggle() {
    onSchemaUpdate({ ...schema, leadCapture: { enabled: !enabled } })
  }

  function downloadCsv() {
    const rows = [
      ['email', 'captured_at'],
      ...leads.map((l) => [l.email, l.captured_at]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="w-full max-w-md mx-auto rounded-2xl overflow-hidden mt-4"
      style={{
        background: 'var(--form-card)',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header: title + toggle */}
      <div className="px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--form-text)' }}>
            Lead Capture
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--form-muted)' }}>
            Collect emails before showing results
          </p>
        </div>

        <button
          onClick={handleToggle}
          aria-label={enabled ? 'Disable lead capture' : 'Enable lead capture'}
          style={{
            width: 40,
            height: 24,
            borderRadius: 12,
            background: enabled ? 'var(--form-accent)' : 'var(--form-border)',
            position: 'relative',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 3,
              left: enabled ? 19 : 3,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s',
              display: 'block',
            }}
          />
        </button>
      </div>

      {/* Leads section — only when enabled */}
      {enabled && (
        <div
          className="px-8 pb-6"
          style={{ borderTop: '1px solid var(--form-border)' }}
        >
          <div className="flex items-center justify-between pt-4 pb-3">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--form-muted)', letterSpacing: '0.1em' }}
            >
              {loadingLeads
                ? 'Loading…'
                : `${leads.length} lead${leads.length !== 1 ? 's' : ''}`}
            </span>
            {leads.length > 0 && (
              <button
                onClick={downloadCsv}
                className="text-xs font-medium"
                style={{ color: 'var(--form-accent)' }}
              >
                ↓ CSV
              </button>
            )}
          </div>

          {!loadingLeads && leads.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--form-border)' }}>
              No leads yet — share your form to start collecting.
            </p>
          )}

          {leads.slice(0, 5).map((lead, i) => (
            <div
              key={i}
              className="py-2.5"
              style={{ borderTop: i > 0 ? '1px solid var(--form-border)' : 'none' }}
            >
              <p className="text-xs font-medium" style={{ color: 'var(--form-text)' }}>
                {lead.email}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--form-muted)' }}>
                {new Date(lead.captured_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          ))}

          {leads.length > 5 && (
            <p className="text-xs mt-2" style={{ color: 'var(--form-muted)' }}>
              +{leads.length - 5} more — download CSV to see all
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/LeadCapturePanel.tsx
git commit -m "feat: add LeadCapturePanel component"
```

---

## Task 7: Wire LeadCapturePanel into builder + end-to-end test

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add import to builder page**

In `app/page.tsx`, add after the existing component imports:

```tsx
import LeadCapturePanel from '@/components/LeadCapturePanel'
```

- [ ] **Step 2: Render LeadCapturePanel below FormRenderer**

In `app/page.tsx`, replace the right panel `{schema ? (...) : (...)}` block with:

```tsx
          {schema ? (
            <>
              <FormRenderer
                schema={schema}
                formId={formId ?? undefined}
                showShare={!!formId}
              />
              {formId && (
                <LeadCapturePanel
                  formId={formId}
                  schema={schema}
                  onSchemaUpdate={handleSchemaUpdate}
                />
              )}
            </>
          ) : (
            <EmptyFormPreview />
          )}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: End-to-end test**

Run `npm run dev` if not already running. Open http://localhost:3000.

**Test A — Toggle:**
1. Build a form via chat (e.g., "profit calculator with revenue and expenses")
2. Once saved, `LeadCapturePanel` appears below the form card
3. Toggle ON → toggle turns purple, leads section expands with "0 leads"
4. Toggle OFF → section collapses, toggle goes grey

**Test B — Gate on shared form:**
1. Toggle ON, click "Copy link", open the `/f/[id]` URL in a new incognito tab
2. Results card is blurred with email overlay ✓
3. Enter a valid email → "See My Results →" → results unblur ✓
4. Refresh → results show without gate (localStorage bypass) ✓

**Test C — Lead in builder:**
1. Return to builder tab, reload the page
2. Toggle the lead capture back ON — the panel fetches and shows the email just submitted ✓

**Test D — CSV:**
1. With at least one lead visible, click "↓ CSV"
2. `leads.csv` downloads with `email,captured_at` header and one row per lead ✓

- [ ] **Step 6: Final commit**

```bash
git add app/page.tsx
git commit -m "feat: add LeadCapturePanel to builder — Task 13 complete"
```

- [ ] **Step 7: Push to deploy**

```bash
git push origin main
```

Auto-deploys to https://incandescent-cannoli-35680d.netlify.app. Monitor at https://app.netlify.com.
