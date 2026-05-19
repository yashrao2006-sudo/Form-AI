'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Message, FormSchema } from '@/lib/types'

interface ChatPanelProps {
  messages: Message[]
  onMessagesChange: (messages: Message[]) => void
  onSchemaUpdate: (schema: FormSchema) => void
}

// Strip <FORM_SCHEMA>...</FORM_SCHEMA> before displaying text
function displayContent(content: string): string {
  return content.replace(/<FORM_SCHEMA>[\s\S]*?<\/FORM_SCHEMA>/g, '').trim()
}

// Render newlines as <br /> — minimal but sufficient for Claude's output
function MessageText({ content }: { content: string }) {
  const text = displayContent(content)
  if (!text) return null
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {text}
    </p>
  )
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: 'var(--form-muted)',
            animation: 'pulse 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </span>
  )
}

export default function ChatPanel({
  messages,
  onMessagesChange,
  onSchemaUpdate,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMessage: Message = { role: 'user', content: text }
    const nextMessages: Message[] = [...messages, userMessage]

    setInput('')
    setStreaming(true)

    // Optimistically add user message + empty assistant placeholder
    const placeholder: Message = { role: 'assistant', content: '' }
    onMessagesChange([...nextMessages, placeholder])

    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let assistantContent = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line) as
              | { type: 'text_delta'; content: string }
              | { type: 'schema'; schema: FormSchema }
              | { type: 'done' }
              | { type: 'error'; message: string }

            if (event.type === 'text_delta') {
              assistantContent += event.content
              onMessagesChange([
                ...nextMessages,
                { role: 'assistant', content: assistantContent },
              ])
            } else if (event.type === 'schema') {
              onSchemaUpdate(event.schema)
            }
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      // Replace placeholder with error message
      onMessagesChange([
        ...nextMessages,
        {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
        },
      ])
    } finally {
      setStreaming(false)
      abortRef.current = null
      inputRef.current?.focus()
    }
  }, [input, messages, streaming, onMessagesChange, onSchemaUpdate])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--form-bg)' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--form-accent)' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="14" height="10" rx="2" stroke="white" strokeWidth="1.4" />
                <path d="M5 7h8M5 10h5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M6 12l-2 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M12 12l2 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p
                className="text-base font-semibold"
                style={{
                  fontFamily: 'var(--font-playfair), Georgia, serif',
                  color: 'var(--form-text)',
                }}
              >
                What do you need to calculate?
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--form-muted)' }}
              >
                Describe any business calculator in plain English.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {[
                'Profit & loss calculator',
                'Invoice estimator',
                'Payroll calculator',
              ].map((hint) => (
                <button
                  key={hint}
                  onClick={() => setInput(hint)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors duration-150"
                  style={{
                    color: 'var(--form-muted)',
                    borderColor: 'var(--form-border)',
                    background: 'var(--form-card)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--form-accent)'
                    e.currentTarget.style.color = 'var(--form-accent)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--form-border)'
                    e.currentTarget.style.color = 'var(--form-muted)'
                  }}
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const isLastAssistant =
            !isUser && i === messages.length - 1 && streaming

          return (
            <div
              key={i}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                  style={{ background: 'var(--form-accent)' }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <rect x="1" y="1" width="9" height="7" rx="1.5" stroke="white" strokeWidth="1.1" />
                    <path d="M3 4.5h5M3 6.5h3" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              <div
                className="max-w-[80%] rounded-2xl px-4 py-3"
                style={
                  isUser
                    ? {
                        background: 'var(--form-accent)',
                        color: '#ffffff',
                        borderBottomRightRadius: '4px',
                      }
                    : {
                        background: 'var(--form-card)',
                        color: 'var(--form-text)',
                        border: '1px solid var(--form-border)',
                        borderBottomLeftRadius: '4px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      }
                }
              >
                {isLastAssistant && !displayContent(msg.content) ? (
                  <ThinkingDots />
                ) : (
                  <MessageText content={msg.content} />
                )}
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="flex-shrink-0 px-4 pb-4 pt-2"
        style={{ borderTop: '1px solid var(--form-border)' }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-4 py-3"
          style={{
            background: 'var(--form-card)',
            border: '1px solid var(--form-border)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the calculator you need…"
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed"
            style={{
              color: 'var(--form-text)',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
            style={{
              background:
                input.trim() && !streaming
                  ? 'var(--form-accent)'
                  : 'var(--form-border)',
              cursor: input.trim() && !streaming ? 'pointer' : 'not-allowed',
            }}
          >
            {streaming ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                style={{ animation: 'spin 1s linear infinite' }}
              >
                <path
                  d="M7 1a6 6 0 1 1 0 12A6 6 0 0 1 7 1"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="18"
                  strokeDashoffset="6"
                />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M12 7H2M7 2l5 5-5 5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
        <p
          className="text-center text-xs mt-2"
          style={{ color: 'var(--form-border)' }}
        >
          Enter to send · Shift+Enter for new line
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
