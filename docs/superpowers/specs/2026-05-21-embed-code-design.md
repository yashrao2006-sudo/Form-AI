# Embed Code — Design Spec
**Date:** 2026-05-21
**Status:** Approved

---

## Summary

Add an `<iframe>` embed option to FormAI so form owners can drop their calculator directly onto any website. The shareable link stays unchanged; embed is an additional mode on the existing ShareButton.

---

## New Route — `/embed/[id]`

**File:** `app/embed/[id]/page.tsx`

Server component that fetches the form from Supabase by ID and renders a minimal page:

- No nav header
- `FormRenderer` centered on `--form-bg` background, `showShare={false}`
- Small "Built with FormAI →" footer linking to `/` (organic growth on host sites)
- Returns 404 via `notFound()` for missing IDs

**Headers:** Netlify adds `X-Frame-Options: DENY` by default, which blocks iframes. Override in `netlify.toml` for `/embed/*`:

```toml
[[headers]]
  for = "/embed/*"
  [headers.values]
    X-Frame-Options = ""
    Content-Security-Policy = "frame-ancestors *"
```

---

## Updated `ShareButton`

**File:** `components/ShareButton.tsx`

Gains a **Link | Embed** pill toggle. The toggle switches which text gets copied:

- **Link mode** — copies `${origin}/f/${formId}` (existing behaviour)
- **Embed mode** — copies the iframe snippet:

```html
<iframe src="${origin}/embed/${formId}" width="100%" height="580" frameborder="0" style="border-radius:12px;border:1px solid #e4e4e7;"></iframe>
```

The "Copied!" confirmation and icon swap work identically for both modes.

Toggle is a small pill with two segments (Link / Embed) using `--form-accent` fill for the active segment. Sits to the left of the copy button in the form footer, replacing the current single-state button.

---

## What Doesn't Change

- `FormRenderer` — no changes
- `/f/[id]` shared view — no changes
- Supabase schema — no changes
- No new API routes
- All existing tests continue to pass

---

## Files Touched

| File | Change |
|------|--------|
| `app/embed/[id]/page.tsx` | New — minimal iframe-safe form page |
| `components/ShareButton.tsx` | Updated — Link/Embed toggle |
| `netlify.toml` | Updated — allow-frame headers for `/embed/*` |

---

## Success Criteria

- Pasting the embed snippet into any HTML page renders the live calculator
- Switching Link ↔ Embed in the toggle copies the correct string
- The embedded form calculates correctly (formula evaluator runs client-side)
- "Built with FormAI" footer is visible inside the iframe
- `/f/[id]` shared view is unaffected
