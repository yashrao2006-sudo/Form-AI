'use client'

import { useState, useCallback, useRef } from 'react'
import type { Message, FormSchema, Form } from '@/lib/types'
import ChatPanel from '@/components/ChatPanel'
import FormRenderer from '@/components/FormRenderer'

// Debounce helper — fires fn at most once per `delay` ms
function useDebounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback(
    (...args: T) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => fn(...args), delay)
    },
    [fn, delay]
  )
}

export default function BuilderPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [formId, setFormId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const saveSchema = useCallback(
    async (nextSchema: FormSchema, currentFormId: string | null) => {
      setSaving(true)
      try {
        if (!currentFormId) {
          // First save — create new form
          const res = await fetch('/api/forms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schema: nextSchema }),
          })
          if (res.ok) {
            const form: Form = await res.json()
            setFormId(form.id)
          }
        } else {
          // Subsequent save — update existing form
          await fetch(`/api/forms/${currentFormId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schema: nextSchema }),
          })
        }
      } finally {
        setSaving(false)
      }
    },
    []
  )

  const debouncedSave = useDebounce(saveSchema, 600)

  const handleSchemaUpdate = useCallback(
    (nextSchema: FormSchema) => {
      setSchema(nextSchema)
      debouncedSave(nextSchema, formId)
    },
    [formId, debouncedSave]
  )

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: 'var(--form-bg)' }}
    >
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-6 h-14 border-b"
        style={{
          background: 'var(--form-card)',
          borderColor: 'var(--form-border)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--form-accent)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="1.5" width="11" height="8" rx="1.5" stroke="white" strokeWidth="1.2" />
              <path d="M4 6h6M4 8h4" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M5 9.5l-1.5 3" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M9 9.5l1.5 3" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <span
            className="font-semibold text-sm tracking-tight"
            style={{ color: 'var(--form-text)' }}
          >
            FormAI
          </span>
        </div>

        {saving && (
          <span
            className="text-xs flex items-center gap-1.5"
            style={{ color: 'var(--form-muted)' }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <path
                d="M6 1a5 5 0 1 1 0 10A5 5 0 0 1 6 1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="14"
                strokeDashoffset="5"
              />
            </svg>
            Saving…
          </span>
        )}
      </header>

      {/* Main split layout */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left — Chat */}
        <div
          className="flex flex-col md:w-[44%] border-b md:border-b-0 md:border-r"
          style={{
            borderColor: 'var(--form-border)',
            minHeight: schema ? '40vh' : '100%',
            maxHeight: schema ? '50vh' : '100%',
          }}
        >
          <ChatPanel
            messages={messages}
            onMessagesChange={setMessages}
            onSchemaUpdate={handleSchemaUpdate}
          />
        </div>

        {/* Right — Form preview */}
        <div
          className="flex-1 overflow-y-auto flex items-start justify-center px-6 py-8"
          style={{ background: 'var(--form-bg)' }}
        >
          {schema ? (
            <FormRenderer
              schema={schema}
              formId={formId ?? undefined}
              showShare={!!formId}
            />
          ) : (
            <EmptyFormPreview />
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function EmptyFormPreview() {
  return (
    <div
      className="w-full max-w-md rounded-2xl p-10 flex flex-col items-center justify-center gap-4 text-center"
      style={{
        background: 'var(--form-card)',
        border: '1.5px dashed var(--form-border)',
        minHeight: '300px',
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center opacity-30"
        style={{ background: 'var(--form-accent)' }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="2" y="2" width="18" height="13" rx="2.5" stroke="white" strokeWidth="1.5" />
          <path d="M6 9h10M6 12.5h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 15l-2 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M14 15l2 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p
        className="text-sm font-medium"
        style={{ color: 'var(--form-muted)' }}
      >
        Your form will appear here
      </p>
      <p
        className="text-xs max-w-[220px] leading-relaxed"
        style={{ color: 'var(--form-border)' }}
      >
        Describe what you need in the chat — FormAI will build it live.
      </p>
    </div>
  )
}
