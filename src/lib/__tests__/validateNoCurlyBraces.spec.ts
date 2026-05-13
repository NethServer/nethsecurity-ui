import { describe, expect, it } from 'vitest'
import { validateNoCurlyBraces } from '@/lib/validation'

describe('validateNoCurlyBraces', () => {
  it('accepts an empty string', () => {
    expect(validateNoCurlyBraces('').valid).toBe(true)
  })

  it('accepts whitespace-only values', () => {
    expect(validateNoCurlyBraces('   ').valid).toBe(true)
  })

  it.each(['{secret', 'secret}', 'sec{ret}', '{}'])('rejects "%s"', (input) => {
    const result = validateNoCurlyBraces(input)

    expect(result.valid).toBe(false)
    expect(result.errMessage).toBeDefined()
  })

  it('accepts special characters other than curly braces', () => {
    expect(validateNoCurlyBraces('p@ssw0rd![]()').valid).toBe(true)
  })
})
