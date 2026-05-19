'use client'

import { useState, useMemo } from 'react'
import type { FormSchema } from '@/lib/types'
import { evaluateFormula } from '@/lib/evaluator'
import ShareButton from './ShareButton'

interface FormRendererProps {
  schema: FormSchema
  formId?: string
  showShare?: boolean
}

function formatValue(value: number, format: string): string {
  if (!isFinite(value) || isNaN(value)) return '—'
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }
  if (format === 'percent') {
    return value.toFixed(2) + '%'
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

function sanitize(raw: string): string {
  // Allow digits, one decimal point
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const parts = cleaned.split('.')
  return parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned
}

export default function FormRenderer({
  schema,
  formId,
  showShare = true,
}: FormRendererProps) {
  const [raw, setRaw] = useState<Record<string, string>>({})

  const nums = useMemo(() => {
    const out: Record<string, number> = {}
    for (const inp of schema.inputs) {
      out[inp.id] = parseFloat(raw[inp.id] ?? '') || 0
    }
    return out
  }, [raw, schema.inputs])

  const hasValues = Object.values(nums).some((v) => v !== 0)

  return (
    <div
      className="w-full max-w-md mx-auto rounded-2xl overflow-hidden"
      style={{
        background: 'var(--form-card)',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div className="px-8 pt-8 pb-6">
        <h1
          className="text-2xl font-semibold leading-tight mb-1"
          style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            color: 'var(--form-text)',
            letterSpacing: '-0.01em',
          }}
        >
          {schema.title}
        </h1>
        <div
          className="mt-5 h-px w-full"
          style={{ background: 'var(--form-border)' }}
        />
      </div>

      {/* Inputs */}
      <div className="px-8 pb-2">
        {schema.inputs.map((inp, i) => (
          <div
            key={inp.id}
            className="flex items-center justify-between py-4"
            style={{
              borderBottom:
                i < schema.inputs.length - 1
                  ? '1px solid var(--form-border)'
                  : 'none',
            }}
          >
            <label
              htmlFor={inp.id}
              className="text-xs font-semibold uppercase tracking-widest cursor-pointer select-none"
              style={{ color: 'var(--form-muted)', letterSpacing: '0.1em' }}
            >
              {inp.label}
            </label>

            <div className="flex items-baseline gap-1">
              {inp.type === 'currency' && (
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--form-muted)' }}
                >
                  $
                </span>
              )}
              <input
                id={inp.id}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={raw[inp.id] ?? ''}
                onChange={(e) =>
                  setRaw((prev) => ({
                    ...prev,
                    [inp.id]: sanitize(e.target.value),
                  }))
                }
                className="text-right text-lg font-semibold bg-transparent outline-none w-36 border-b-2 pb-0.5 transition-colors duration-150 tabular-nums"
                style={{
                  color: 'var(--form-text)',
                  borderColor:
                    raw[inp.id]
                      ? 'var(--form-accent)'
                      : 'var(--form-border)',
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = 'var(--form-accent)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = raw[inp.id]
                    ? 'var(--form-accent)'
                    : 'var(--form-border)')
                }
              />
              {inp.type === 'percent' && (
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--form-muted)' }}
                >
                  %
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Outputs */}
      {schema.outputs.length > 0 && (
        <div className="mx-5 mb-5 rounded-xl overflow-hidden" style={{ background: 'var(--form-accent)' }}>
          <div
            className="px-6 pt-5 pb-1 text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: 'var(--form-accent-muted)' }}
          >
            Results
          </div>
          {schema.outputs.map((out, i) => {
            const value = evaluateFormula(out.formula, nums)
            return (
              <div
                key={i}
                className="flex items-center justify-between px-6 py-4"
                style={{
                  borderTop:
                    i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                >
                  {out.label}
                </span>
                <span
                  className="text-xl font-bold tabular-nums transition-all duration-150"
                  style={{
                    color: '#ffffff',
                    opacity: hasValues ? 1 : 0.35,
                  }}
                >
                  {formatValue(value, out.format)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between px-8 pb-6 pt-1"
        style={{ borderTop: schema.outputs.length > 0 ? 'none' : '1px solid var(--form-border)' }}
      >
        {showShare && formId ? (
          <ShareButton formId={formId} />
        ) : (
          <span />
        )}
        <span
          className="text-xs"
          style={{ color: 'var(--form-border)', letterSpacing: '0.03em' }}
        >
          Built with FormAI
        </span>
      </div>
    </div>
  )
}
