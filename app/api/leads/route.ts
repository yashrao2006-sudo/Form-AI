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
