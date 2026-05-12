---
name: testing
description: Write or review Vitest unit tests in this project. Use when adding tests for lib utilities, valibot schemas, composables, or validation helpers. Covers TDD approach, meaningful test design (edge cases, pitfalls), what not to test, mocking ubusCall, and test file location conventions.
metadata:
  project: nethsecurity-ui
  framework: vitest
  environment: jsdom
---

# Testing with Vitest

Tests live in `src/**/__tests__/*.spec.ts`. Vitest is configured with the `jsdom` environment (see `vitest.config.ts`). The `@vitest/eslint-plugin` is active for test files.

## TDD Approach

Write the test first, make it fail, then implement. For every function/schema:

1. Write tests for **edge cases and known pitfalls** — boundary values, empty strings, special characters
2. Write tests for **invalid inputs that look valid** — e.g. `"256.0.0.1"` for IP validation
3. Only then add a minimal happy-path test to confirm the basic contract

## What to Test (and What Not To)

| Worth testing                                | Skip (TypeScript handles it)              |
| -------------------------------------------- | ----------------------------------------- |
| Boundary values (0, 65535, 65536)            | Passing the wrong type to a function      |
| Empty / whitespace-only strings              | Return type shape                         |
| Off-by-one errors                            | Import resolution                         |
| Invalid-but-close inputs (`"192.168.1.256"`) | Obvious happy path that cannot fail       |
| Validator error messages / i18n keys         | Type narrowing already done in source     |
| valibot schema rejects unexpected shapes     | Re-testing what valibot itself guarantees |

## Structure

```ts
import { describe, it, expect } from 'vitest'
import { validateIpAddress } from '@/lib/validation.ts'

describe('validateIpAddress', () => {
  // Edge cases first
  it('rejects an empty string', () => {
    expect(validateIpAddress('').valid).toBe(false)
  })

  it('rejects 256 in any octet', () => {
    expect(validateIpAddress('256.0.0.1').valid).toBe(false)
    expect(validateIpAddress('0.256.0.1').valid).toBe(false)
  })

  it('rejects trailing dots', () => {
    expect(validateIpAddress('192.168.1.1.').valid).toBe(false)
  })

  it('rejects partial addresses', () => {
    expect(validateIpAddress('192.168').valid).toBe(false)
  })

  // Happy path — confirm basic contract
  it('accepts a valid IPv4 address', () => {
    expect(validateIpAddress('192.168.1.1').valid).toBe(true)
  })
})
```

## `test.each` for Boundary Tables

Use `test.each` when covering multiple boundary inputs against the same assertion — not as a way to inflate test count with trivial examples:

```ts
describe('validateMetric', () => {
  it.each([
    ['0', true],    // minimum boundary
    ['65535', true], // maximum boundary
    ['65536', false], // just over maximum
    ['-1', false],   // negative — looks like a number but shouldn't pass
    ['', false],     // empty
    ['12.3', false], // float looks numeric
    ['12a', false],  // mixed alphanumeric
  ])('"%s" → valid: %s', (input, expected) => {
    expect(validateMetric(input).valid).toBe(expected)
  })
})
```

## Valibot Schema Tests

When testing a valibot schema used in a form, test the **schema in isolation** — not the entire component:

```ts
import * as v from 'valibot'

const schema = v.object({
  port: v.pipe(
    v.string(),
    v.check((val) => /^\d+$/.test(val) && +val >= 1 && +val <= 65535, 'error.invalid_port')
  ),
})

describe('port schema', () => {
  it('rejects port 0 (reserved)', () => {
    expect(v.safeParse(schema, { port: '0' }).success).toBe(false)
  })

  it('rejects port 65536 (out of range)', () => {
    expect(v.safeParse(schema, { port: '65536' }).success).toBe(false)
  })

  it('rejects non-numeric string', () => {
    expect(v.safeParse(schema, { port: 'abc' }).success).toBe(false)
  })

  it('accepts port 1 (minimum valid)', () => {
    expect(v.safeParse(schema, { port: '1' }).success).toBe(true)
  })

  it('accepts port 65535 (maximum valid)', () => {
    expect(v.safeParse(schema, { port: '65535' }).success).toBe(true)
  })
})
```

## Mocking `ubusCall`

Composables that use `ubusCall` require mocking to avoid real HTTP calls. The mock **must also re-export `ValidationError`** as a real class — components do `instanceof` checks on it:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MessageBag } from '@/lib/validation.ts'

// Must be at module scope, not inside describe/it — vi.mock is hoisted
vi.mock('@/lib/standalone/ubus.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/standalone/ubus.ts')>()
  return {
    ...original,         // keeps ValidationError, ubusCallFromController, etc.
    ubusCall: vi.fn(),   // replace only what needs mocking
  }
})

import { ubusCall } from '@/lib/standalone/ubus.ts'
const mockUbusCall = vi.mocked(ubusCall)

beforeEach(() => {
  mockUbusCall.mockReset()
})

it('returns items from the API', async () => {
  mockUbusCall.mockResolvedValueOnce({ data: { values: [{ id: '1', name: 'rule' }] } })
  // ... call composable/function and assert
})

it('surfaces ValidationError field errors', async () => {
  const { ValidationError } = await import('@/lib/standalone/ubus.ts')
  const bag = new MessageBag()
  bag.set('name', 'error.required')
  mockUbusCall.mockRejectedValueOnce(new ValidationError('Validation failed', bag))
  // ... assert validationBag contains the expected errors
})
```

## Testing Validators — Common Pitfalls

When adding a new validator to `@/lib/validation.ts`, write tests for these cases before anything else:

- Empty string `''`
- Whitespace-only string `'   '`
- Boundary values (min, max, min-1, max+1)
- Inputs that match a subset of the pattern (e.g. partial IP, truncated MAC)
- Inputs with valid characters but wrong structure (e.g. `"192.168.1.1.1"` for IP)
- Unicode / special characters that might fool regex anchoring

## Gotchas

- **`vi.mock()` is hoisted to module scope** — Vitest moves all `vi.mock()` calls to the top of the file before imports. Never put `vi.mock` inside `describe` or `it`. Variables defined in the module scope are not available inside the mock factory — use `vi.importActual` / `async (importOriginal) =>` instead.
- **Mocking `ubus.ts` with `{ ubusCall: vi.fn() }` breaks `instanceof ValidationError`** — the mock factory replaces the whole module, so `ValidationError` becomes `undefined`. Always spread the original module and only override what needs mocking (see example above).
- **`vi.mocked()` must be called after the mock is set up** — call `vi.mocked(ubusCall)` at module scope after `vi.mock(...)`, not inside `beforeEach`.
- **`mockReset()` in `beforeEach` is required** — without it, `mockResolvedValueOnce` calls accumulate and bleed between tests. `mockClear()` only resets call counts, not return values; use `mockReset()`.
- **Don't test the `errMessage` i18n key value in isolation** — the key string is defined in `@/lib/validation.ts`; test that `valid` is `false` and that `errMessage` is defined. Testing the exact key string (`'error.invalid_ip_address'`) makes the test brittle to i18n key renames.

## File Location

```
src/
  lib/
    __tests__/
      myHelper.spec.ts    # for src/lib/myHelper.ts
  composables/
    __tests__/            # create if needed
      useMyComposable.spec.ts
```

Test files match `src/**/__tests__/*.spec.ts` as configured in `eslint.config.js`.
