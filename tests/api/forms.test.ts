import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { POST } from '@/app/api/forms/route'
import { GET, PUT } from '@/app/api/forms/[id]/route'
import { supabaseAdmin } from '@/lib/supabase'

const validSchema = {
  title: 'Profit Calculator',
  inputs: [{ id: 'revenue', label: 'Revenue', type: 'currency' }],
  outputs: [{ label: 'Profit', formula: 'revenue * 0.2', format: 'currency' }],
}

function mockChain(data: unknown, error: unknown = null) {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  }
  vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── POST /api/forms ──────────────────────────────────────────────────────────

describe('POST /api/forms', () => {
  it('creates a form and returns 201 with the new form', async () => {
    const form = {
      id: 'abc123',
      schema: validSchema,
      created_at: '2026-04-09T00:00:00Z',
      updated_at: '2026-04-09T00:00:00Z',
    }
    mockChain(form)

    const req = new Request('http://localhost/api/forms', {
      method: 'POST',
      body: JSON.stringify({ schema: validSchema }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('abc123')
    expect(body.schema).toEqual(validSchema)
  })

  it('returns 400 when schema is missing from body', async () => {
    const req = new Request('http://localhost/api/forms', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when schema has no title', async () => {
    const req = new Request('http://localhost/api/forms', {
      method: 'POST',
      body: JSON.stringify({ schema: { inputs: [], outputs: [] } }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 when Supabase returns an error', async () => {
    mockChain(null, { message: 'db error' })

    const req = new Request('http://localhost/api/forms', {
      method: 'POST',
      body: JSON.stringify({ schema: validSchema }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})

// ─── GET /api/forms/[id] ─────────────────────────────────────────────────────

describe('GET /api/forms/[id]', () => {
  it('returns 200 with form data when found', async () => {
    const form = {
      id: 'abc123',
      schema: validSchema,
      created_at: '2026-04-09T00:00:00Z',
      updated_at: '2026-04-09T00:00:00Z',
    }
    mockChain(form)

    const req = new Request('http://localhost/api/forms/abc123')
    const res = await GET(req, { params: Promise.resolve({ id: 'abc123' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('abc123')
    expect(body.schema).toEqual(validSchema)
  })

  it('returns 404 when form not found', async () => {
    mockChain(null, { message: 'Row not found' })

    const req = new Request('http://localhost/api/forms/missing')
    const res = await GET(req, { params: Promise.resolve({ id: 'missing' }) })

    expect(res.status).toBe(404)
  })
})

// ─── PUT /api/forms/[id] ─────────────────────────────────────────────────────

describe('PUT /api/forms/[id]', () => {
  it('updates a form and returns 200', async () => {
    const updated = {
      id: 'abc123',
      schema: validSchema,
      created_at: '2026-04-09T00:00:00Z',
      updated_at: '2026-04-09T01:00:00Z',
    }
    mockChain(updated)

    const req = new Request('http://localhost/api/forms/abc123', {
      method: 'PUT',
      body: JSON.stringify({ schema: validSchema }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'abc123' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.schema).toEqual(validSchema)
  })

  it('returns 404 when form to update does not exist', async () => {
    mockChain(null, { message: 'Row not found' })

    const req = new Request('http://localhost/api/forms/missing', {
      method: 'PUT',
      body: JSON.stringify({ schema: validSchema }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'missing' }) })

    expect(res.status).toBe(404)
  })

  it('returns 400 when schema is missing from body', async () => {
    const req = new Request('http://localhost/api/forms/abc123', {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'abc123' }) })

    expect(res.status).toBe(400)
  })
})
