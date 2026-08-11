//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getProxiedUnitId,
  getUiBasePath,
  getUnitIdFromApiUrl,
  isManagedByController,
  isProxiedByController,
  isStandaloneBuild,
  isUnitApiResponse
} from '@/lib/deployment'

const UNIT_ID = '9f3b1c2e-4a5d-4e6f-8a9b-0c1d2e3f4a5b'

/** Pretend the document was served from the given URL. */
function servedFrom(url: string) {
  vi.spyOn(document, 'baseURI', 'get').mockReturnValue(url)
}

function builtAs(mode: 'standalone' | 'controller') {
  vi.stubEnv('VITE_UI_MODE', mode)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('getUiBasePath', () => {
  it('is / at the site root', () => {
    servedFrom('https://unit.example/')
    expect(getUiBasePath()).toBe('/')
  })

  it('is the unit prefix when proxied by a controller', () => {
    servedFrom(`https://ctrl.example/${UNIT_ID}/`)
    expect(getUiBasePath()).toBe(`/${UNIT_ID}/`)
  })

  it('ignores the hash, so route changes cannot move the base path', () => {
    servedFrom(`https://ctrl.example/${UNIT_ID}/#/standalone/system/ssh`)
    expect(getUiBasePath()).toBe(`/${UNIT_ID}/`)
  })

  it('normalises an explicit index.html to its directory', () => {
    servedFrom(`https://ctrl.example/${UNIT_ID}/index.html`)
    expect(getUiBasePath()).toBe(`/${UNIT_ID}/`)
  })

  // Documents the limitation the controller's addslash redirect exists to prevent: without the
  // slash the browser resolves relative URLs against the origin root, so the API base would
  // silently become the controller's instead of the unit's. Not fixable here — by the time this
  // runs the browser has already resolved the asset URLs.
  it('degrades to / when the document path has no trailing slash', () => {
    servedFrom(`https://ctrl.example/${UNIT_ID}`)
    expect(getUiBasePath()).toBe('/')
  })
})

describe('isProxiedByController', () => {
  it('is false for the standalone bundle at the root', () => {
    builtAs('standalone')
    servedFrom('https://unit.example/')
    expect(isProxiedByController()).toBe(false)
    expect(getProxiedUnitId()).toBe('')
  })

  it('is true for the standalone bundle under a unit prefix', () => {
    builtAs('standalone')
    servedFrom(`https://ctrl.example/${UNIT_ID}/`)
    expect(isProxiedByController()).toBe(true)
    expect(getProxiedUnitId()).toBe(UNIT_ID)
  })

  // The controller UI is served at both / and /ui/. Without the build-mode gate, /ui/ would be
  // read as a unit id and the controller would start calling /ui/api.
  it('is false for the controller bundle served at /ui/', () => {
    builtAs('controller')
    servedFrom('https://ctrl.example/ui/')
    expect(isProxiedByController()).toBe(false)
    expect(getProxiedUnitId()).toBe('')
  })
})

describe('isManagedByController', () => {
  it('is false only for the standalone bundle at the root', () => {
    builtAs('standalone')
    servedFrom('https://unit.example/')
    expect(isManagedByController()).toBe(false)
  })

  it('is true for the proxied standalone bundle', () => {
    builtAs('standalone')
    servedFrom(`https://ctrl.example/${UNIT_ID}/`)
    expect(isManagedByController()).toBe(true)
  })

  it('is true for the controller bundle, which only ever renders units embedded', () => {
    builtAs('controller')
    servedFrom('https://ctrl.example/')
    expect(isManagedByController()).toBe(true)
  })
})

describe('isStandaloneBuild', () => {
  it('reflects VITE_UI_MODE and nothing else', () => {
    builtAs('standalone')
    servedFrom(`https://ctrl.example/${UNIT_ID}/`)
    expect(isStandaloneBuild()).toBe(true)

    builtAs('controller')
    expect(isStandaloneBuild()).toBe(false)
  })
})

describe('isUnitApiResponse', () => {
  it('accepts any JSON reply, including an unauthenticated one', () => {
    expect(isUnitApiResponse('application/json')).toBe(true)
    expect(isUnitApiResponse('application/json; charset=utf-8')).toBe(true)
  })

  // While a unit is down, the controller's catch-all answers with HTTP 200 and HTML. Treating
  // that as "the unit is back" would reload the controller's SPA into the unit's tab.
  it('rejects the controller catch-all answering for a down unit', () => {
    expect(isUnitApiResponse('text/html')).toBe(false)
    expect(isUnitApiResponse('text/html; charset=UTF-8')).toBe(false)
  })

  it('rejects a missing content type', () => {
    expect(isUnitApiResponse(null)).toBe(false)
    expect(isUnitApiResponse('')).toBe(false)
  })
})

describe('getUnitIdFromApiUrl', () => {
  it('extracts the unit id from an absolute per-unit ubus URL', () => {
    expect(getUnitIdFromApiUrl(`https://ctrl.example/${UNIT_ID}/api/ubus/call`)).toBe(UNIT_ID)
  })

  it('extracts the unit id from a relative per-unit URL', () => {
    expect(getUnitIdFromApiUrl(`/${UNIT_ID}/api/ubus/call`)).toBe(UNIT_ID)
  })

  it('handles per-unit endpoints other than ubus', () => {
    expect(getUnitIdFromApiUrl(`https://ctrl.example/${UNIT_ID}/api/refresh`)).toBe(UNIT_ID)
  })

  it('returns undefined when there is no unit segment', () => {
    expect(getUnitIdFromApiUrl('https://unit.example/api/ubus/call')).toBeUndefined()
    expect(getUnitIdFromApiUrl('/api/ubus/call')).toBeUndefined()
  })

  // The regex this replaced returned null for these and then threw on `.length`, inside a
  // response interceptor, which swallowed the error that triggered it.
  it('returns undefined instead of throwing on unexpected input', () => {
    expect(getUnitIdFromApiUrl('')).toBeUndefined()
    expect(getUnitIdFromApiUrl('not a url')).toBeUndefined()
    expect(getUnitIdFromApiUrl('https://ctrl.example/')).toBeUndefined()
  })
})
