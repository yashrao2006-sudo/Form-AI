import { describe, it, expect } from 'vitest'
import { evaluateFormula } from '../lib/evaluator'

describe('evaluateFormula', () => {
  it('evaluates simple subtraction', () => {
    expect(evaluateFormula('revenue - cogs', { revenue: 1000, cogs: 400 })).toBe(600)
  })

  it('evaluates chained subtraction', () => {
    expect(evaluateFormula('revenue - cogs - expenses', { revenue: 1000, cogs: 400, expenses: 200 })).toBe(400)
  })

  it('evaluates percentage formula', () => {
    expect(evaluateFormula('(revenue - cogs) / revenue * 100', { revenue: 1000, cogs: 400 })).toBe(60)
  })

  it('returns 0 for division by zero', () => {
    expect(evaluateFormula('profit / revenue', { profit: 100, revenue: 0 })).toBe(0)
  })

  it('returns 0 for missing variables', () => {
    expect(evaluateFormula('revenue - cogs', { revenue: 1000 })).toBe(0)
  })

  it('returns 0 for invalid formula', () => {
    expect(evaluateFormula('revenue *** cogs', { revenue: 1000, cogs: 400 })).toBe(0)
  })
})
