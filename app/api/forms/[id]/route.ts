import { supabaseAdmin } from '@/lib/supabase'
import type { FormSchema } from '@/lib/types'

function isValidSchema(schema: unknown): schema is FormSchema {
  if (!schema || typeof schema !== 'object') return false
  const s = schema as Record<string, unknown>
  return (
    typeof s.title === 'string' &&
    s.title.length > 0 &&
    Array.isArray(s.inputs) &&
    Array.isArray(s.outputs)
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('forms')
    .select()
    .eq('id', id)
    .single()

  if (error || !data) {
    return Response.json({ error: 'Form not found' }, { status: 404 })
  }

  return Response.json(data)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  if (!isValidSchema(body.schema)) {
    return Response.json({ error: 'Invalid schema' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('forms')
    .update({ schema: body.schema, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return Response.json({ error: 'Form not found' }, { status: 404 })
  }

  return Response.json(data)
}
