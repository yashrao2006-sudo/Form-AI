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
