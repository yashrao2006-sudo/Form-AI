'use client'

import { useState } from 'react'

interface ShareButtonProps {
  formId: string
}

export default function ShareButton({ formId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const url = `${window.location.origin}/f/${formId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 text-sm font-medium transition-all duration-200"
      style={{
        color: copied ? 'var(--form-accent)' : 'var(--form-muted)',
      }}
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
          Copy link
        </>
      )}
    </button>
  )
}
