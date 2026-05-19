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

export async function POST(request: Request) {
  const body = await request.json()

  if (!isValidSchema(body.schema)) {
    return Response.json({ error: 'Invalid schema' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('forms')
    .insert([{ schema: body.schema }])
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}
