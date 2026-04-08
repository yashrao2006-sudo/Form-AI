import { evaluate } from 'mathjs'

export function evaluateFormula(formula: string, values: Record<string, number>): number {
  try {
    const scope: Record<string, number> = {}
    for (const [key, val] of Object.entries(values)) {
      scope[key] = isNaN(val) ? 0 : val
    }
    const result = evaluate(formula, scope)
    if (typeof result !== 'number' || !isFinite(result)) return 0
    return result
  } catch {
    return 0
  }
}
