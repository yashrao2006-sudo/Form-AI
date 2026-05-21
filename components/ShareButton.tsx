'use client'

import { useState } from 'react'

interface ShareButtonProps {
  formId: string
}

type Mode = 'link' | 'embed'

export default function ShareButton({ formId }: ShareButtonProps) {
  const [mode, setMode] = useState<Mode>('link')
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const origin = window.location.origin
    const text =
      mode === 'link'
        ? `${origin}/f/${formId}`
        : `<iframe src="${origin}/embed/${formId}" width="100%" height="580" frameborder="0" style="border-radius:12px;border:1px solid #e4e4e7;"></iframe>`

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2">
      {/* Link / Embed pill toggle */}
      <div
        className="flex text-xs rounded-full overflow-hidden"
        style={{ border: '1px solid var(--form-border)' }}
      >
        {(['link', 'embed'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setCopied(false) }}
            className="px-2.5 py-1 capitalize transition-colors duration-150"
            style={{
              background: mode === m ? 'var(--form-accent)' : 'transparent',
              color: mode === m ? '#ffffff' : 'var(--form-muted)',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-sm font-medium transition-all duration-200"
        style={{ color: copied ? 'var(--form-accent)' : 'var(--form-muted)' }}
      >
        {copied ? (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 2.5H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M8 1h5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 1L7.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Copy {mode}
          </>
        )}
      </button>
    </div>
  )
}
