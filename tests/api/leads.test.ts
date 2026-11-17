import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { POST } from '@/app/api/leads/route'
import { GET } from '@/app/api/leads/[formId]/route'
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
