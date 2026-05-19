import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import FormRenderer from '@/components/FormRenderer'
import type { Form } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('forms')
    .select('schema')
    .eq('id', id)
    .single()

  const title = data?.schema?.title ?? 'Shared Form'
  return {
    title: `${title} — FormAI`,
    description: `Use this ${title.toLowerCase()} — built with FormAI.`,
  }
}

export default async function SharedFormPage({ params }: Props) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('forms')
    .select()
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const form = data as Form

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--form-bg)' }}
    >
      {/* Minimal nav */}
      <header className="flex justify-center pt-8 pb-2">
        <a
          href="/"
          className="flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity"
        >
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: 'var(--form-accent)' }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="1" y="1" width="8" height="6" rx="1.2" stroke="white" strokeWidth="1" />
              <path d="M3 4.5h4M3 6h2.5" stroke="white" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
          <span
            className="text-xs font-semibold tracking-tight"
            style={{ color: 'var(--form-text)' }}
          >
            FormAI
          </span>
        </a>
      </header>

      {/* Form card — centered */}
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <FormRenderer
          schema={form.schema}
          formId={id}
          showShare
        />
      </main>

      {/* Footer */}
      <footer className="pb-8 text-center">
        <a
          href="/"
          className="text-xs transition-colors duration-150"
          style={{ color: 'var(--form-border)' }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = 'var(--form-muted)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'var(--form-border)')
          }
        >
          Build your own calculator at FormAI →
        </a>
      </footer>
    </div>
  )
}
