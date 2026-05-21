# Embed Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an iframe embed option to FormAI so form owners can paste a snippet into any website and have their live calculator appear there.

**Architecture:** Three file changes — a new `/embed/[id]` server-component page (minimal chrome, iframe-safe headers), an updated `ShareButton` with a Link/Embed pill toggle, and a `netlify.toml` header override to unblock iframing for the embed route.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase, `@netlify/plugin-nextjs`

---

### Task 1: Create `/embed/[id]` page

**Files:**
- Create: `app/embed/[id]/page.tsx`

- [ ] **Step 1: Create `app/embed/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import FormRenderer from '@/components/FormRenderer'
import type { Form } from '@/lib/types'

export default async function EmbedFormPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('forms')
    .select()
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  const form = data as Form

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--form-bg)' }}
    >
      <div className="w-full max-w-md">
        <FormRenderer schema={form.schema} showShare={false} />
        <p className="text-center text-xs mt-4">
          <a href="/" style={{ color: 'var(--form-border)' }}>
            Built with FormAI →
          </a>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add "app/embed/[id]/page.tsx"
git commit -m "feat: add /embed/[id] page for iframe embedding"
```

---

### Task 2: Add iframe-allow headers to netlify.toml

**Files:**
- Modify: `netlify.toml`

- [ ] **Step 1: Replace `netlify.toml` with this content**

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[[headers]]
  for = "/embed/*"
  [headers.values]
    X-Frame-Options = ""
    Content-Security-Policy = "frame-ancestors *"
```

- [ ] **Step 2: Commit**

```bash
git add netlify.toml
git commit -m "feat: allow iframing for /embed/* routes"
```

---

### Task 3: Update ShareButton with Link/Embed toggle

**Files:**
- Modify: `components/ShareButton.tsx`

- [ ] **Step 1: Replace `components/ShareButton.tsx` with this content**

```tsx
'use client'

import { useState } from 'react'

interface ShareButtonProps {
  formId: string
}

type Mode = 'link' | 'embed'

export default function ShareButton({ formId }: ShareButtonProps) {
  const [mode, setMode] = useState<Mode>('link')
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const origin = window.location.origin
    const text =
      mode === 'link'
        ? `${origin}/f/${formId}`
        : `<iframe src="${origin}/embed/${formId}" width="100%" height="580" frameborder="0" style="border-radius:12px;border:1px solid #e4e4e7;"></iframe>`

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2">
      {/* Link / Embed pill toggle */}
      <div
        className="flex text-xs rounded-full overflow-hidden"
        style={{ border: '1px solid var(--form-border)' }}
      >
        {(['link', 'embed'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setCopied(false) }}
            className="px-2.5 py-1 capitalize transition-colors duration-150"
            style={{
              background: mode === m ? 'var(--form-accent)' : 'transparent',
              color: mode === m ? '#ffffff' : 'var(--form-muted)',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-sm font-medium transition-all duration-200"
        style={{ color: copied ? 'var(--form-accent)' : 'var(--form-muted)' }}
      >
        {copied ? (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 2.5H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M8 1h5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 1L7.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Copy {mode}
          </>
        )}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: `15 passed (15)`.

- [ ] **Step 4: Commit**

```bash
git add components/ShareButton.tsx
git commit -m "feat: add Link/Embed toggle to ShareButton"
```

---

### Task 4: Push and verify on Netlify

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Wait for Netlify deploy (~30s)**

Watch `https://app.netlify.com/projects/incandescent-cannoli-35680d/deploys` until the top entry shows **Published**.

- [ ] **Step 3: Build a test form and verify the toggle**

1. Go to `https://incandescent-cannoli-35680d.netlify.app`
2. Build any calculator via the chat
3. In the form footer confirm the **Link | Embed** pill appears
4. Click **Link** → **Copy link** → confirm URL is `/f/<id>`
5. Click **Embed** → **Copy embed** → confirm text is the full `<iframe ...>` snippet

- [ ] **Step 4: Verify the embed page directly**

Navigate to `https://incandescent-cannoli-35680d.netlify.app/embed/<id>`. Confirm:
- No nav header
- Form renders and calculates correctly
- "Built with FormAI →" footer is visible

- [ ] **Step 5: Verify iframing is not blocked**

Open browser DevTools console on any page and run:

```javascript
const f = document.createElement('iframe')
f.src = 'https://incandescent-cannoli-35680d.netlify.app/embed/YOUR_FORM_ID'
f.width = '600'; f.height = '580'
document.body.appendChild(f)
```

Expected: iframe loads with no `Refused to display` error in the console.
