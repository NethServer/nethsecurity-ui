//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import { maskUrlCredentials } from '@/composables/useThreatShieldCustomLists'

describe('maskUrlCredentials', () => {
  it('hides user and password', () => {
    expect(maskUrlCredentials('https://user:pass@example.com/a@b')).toBe(
      'https://***@example.com/a@b'
    )
  })

  it('leaves URLs without credentials unchanged', () => {
    expect(maskUrlCredentials('https://example.com/list.txt')).toBe('https://example.com/list.txt')
  })
})
