//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPreferencesScope, getScopedStorageKey, getSessionStorageKey } from '@/lib/storage'

const UNIT_A = '9f3b1c2e-4a5d-4e6f-8a9b-0c1d2e3f4a5b'
const UNIT_B = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'

function servedFrom(path: string) {
  vi.spyOn(document, 'baseURI', 'get').mockReturnValue(`${window.location.origin}${path}`)
}

function builtAs(mode: 'standalone' | 'controller') {
  vi.stubEnv('VITE_UI_MODE', mode)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('getSessionStorageKey', () => {
  it('is the plain key when the unit serves its own UI', () => {
    builtAs('standalone')
    servedFrom('/')

    expect(getSessionStorageKey()).toBe('standaloneLoginInfo')
  })

  // This is the handoff contract: the controller writes unit-<uuid> before opening the tab, and
  // the proxied UI must read back that exact key rather than prompting for a login.
  it('is the controller handoff key when proxied', () => {
    builtAs('standalone')
    servedFrom(`/${UNIT_A}/`)

    expect(getSessionStorageKey()).toBe(`unit-${UNIT_A}`)
  })

  // The controller bundle's legacy embedded route has the unit as a route param, not a path
  // prefix, so it has to pass the id in explicitly — otherwise it would write the wrong key.
  it('uses an explicitly passed unit id, for the legacy embedded route', () => {
    builtAs('controller')
    servedFrom('/')

    expect(getSessionStorageKey(UNIT_A)).toBe(`unit-${UNIT_A}`)
  })

  it('falls back to the plain key when the controller bundle has no unit in scope', () => {
    builtAs('controller')
    servedFrom('/')

    expect(getSessionStorageKey(undefined)).toBe('standaloneLoginInfo')
    expect(getSessionStorageKey('')).toBe('standaloneLoginInfo')
  })

  it('keeps two proxied units apart', () => {
    builtAs('standalone')

    servedFrom(`/${UNIT_A}/`)
    const keyA = getSessionStorageKey()
    servedFrom(`/${UNIT_B}/`)
    const keyB = getSessionStorageKey()

    expect(keyA).not.toBe(keyB)
  })
})

describe('getScopedStorageKey', () => {
  it('leaves the key alone at the root', () => {
    builtAs('standalone')
    servedFrom('/')

    expect(getScopedStorageKey('standaloneUsername')).toBe('standaloneUsername')
  })

  it('scopes the key to the unit when proxied', () => {
    builtAs('standalone')
    servedFrom(`/${UNIT_A}/`)

    expect(getScopedStorageKey('standaloneUsername')).toBe(`unit-${UNIT_A}.standaloneUsername`)
  })
})

describe('getPreferencesScope', () => {
  it('leaves the username alone at the root', () => {
    builtAs('standalone')
    servedFrom('/')

    expect(getPreferencesScope('root')).toBe('root')
  })

  // Both units authenticate as root, so without scoping they would share preferences-root and
  // leak theme, locale and menu state into each other.
  it('scopes the username per unit when proxied', () => {
    builtAs('standalone')

    servedFrom(`/${UNIT_A}/`)
    expect(getPreferencesScope('root')).toBe(`${UNIT_A}:root`)
    servedFrom(`/${UNIT_B}/`)
    expect(getPreferencesScope('root')).toBe(`${UNIT_B}:root`)
  })

  it('leaves the controller admin unscoped', () => {
    builtAs('controller')
    servedFrom('/')

    expect(getPreferencesScope('admin')).toBe('admin')
  })
})
