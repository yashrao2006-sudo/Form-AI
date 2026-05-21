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
