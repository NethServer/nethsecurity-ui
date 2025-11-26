import { describe, it, expect } from 'vitest'
import { validateMetric } from '@/lib/validation'

describe('validateMetric', () => {
  const validValues = ['0', '1', '65535', '001', ' 42 '] // leading zeros and whitespace should be accepted
  const invalidValues = ['', ' ', '12.3', '-1', '70000', 'abc', '12a']

  validValues.forEach((v) =>
    it(`returns valid for "${v}"`, () => {
      const res = validateMetric(v)
      expect(res.valid).toBe(true)
    })
  )

  invalidValues.forEach((v) =>
    it(`returns invalid for "${v}"`, () => {
      const res = validateMetric(v)
      expect(res.valid).toBe(false)
      expect(res.errMessage).toBeDefined()
    })
  )
})
