//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, describe, expect, it, vi } from 'vitest'
import { getControllerApiEndpoint, getStandaloneApiEndpoint } from '@/lib/config'

const UNIT_ID = '9f3b1c2e-4a5d-4e6f-8a9b-0c1d2e3f4a5b'

// window.location.origin can't be stubbed independently of jsdom, so tests assert against it directly.
const ORIGIN = window.location.origin

/** Pretend the document was served from the given path on the jsdom origin. */
function servedFrom(path: string) {
  vi.spyOn(document, 'baseURI', 'get').mockReturnValue(`${ORIGIN}${path}`)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('getStandaloneApiEndpoint', () => {
  describe('production', () => {
    it('targets the origin root when the unit serves its own UI', () => {
      vi.stubEnv('VITE_UI_MODE', 'standalone')
      vi.stubEnv('DEV', false)
      servedFrom('/')

      expect(getStandaloneApiEndpoint()).toBe(`${ORIGIN}/api`)
    })

    it('targets the unit prefix when proxied by a controller', () => {
      vi.stubEnv('VITE_UI_MODE', 'standalone')
      vi.stubEnv('DEV', false)
      servedFrom(`/${UNIT_ID}/`)

      expect(getStandaloneApiEndpoint()).toBe(`${ORIGIN}/${UNIT_ID}/api`)
    })

    it('ignores the hash route when deriving the endpoint', () => {
      vi.stubEnv('VITE_UI_MODE', 'standalone')
      vi.stubEnv('DEV', false)
      servedFrom(`/${UNIT_ID}/#/standalone/firewall/rules`)

      expect(getStandaloneApiEndpoint()).toBe(`${ORIGIN}/${UNIT_ID}/api`)
    })
  })

  describe('development', () => {
    it('uses the configured standalone host at the root', () => {
      vi.stubEnv('VITE_UI_MODE', 'standalone')
      vi.stubEnv('DEV', true)
      vi.stubEnv('VITE_API_SCHEME', 'https')
      vi.stubEnv('VITE_STANDALONE_API_HOST', '10.0.1.1:9090')
      servedFrom('/')

      expect(getStandaloneApiEndpoint()).toBe('https://10.0.1.1:9090/api')
    })

    // `npm run dev -- --base=/<uuid>/` against a real controller.
    it('uses the configured controller host when served under a unit prefix', () => {
      vi.stubEnv('VITE_UI_MODE', 'standalone')
      vi.stubEnv('DEV', true)
      vi.stubEnv('VITE_API_SCHEME', 'https')
      vi.stubEnv('VITE_CONTROLLER_API_HOST', 'ctrl.example')
      servedFrom(`/${UNIT_ID}/`)

      expect(getStandaloneApiEndpoint()).toBe(`https://ctrl.example/${UNIT_ID}/api`)
    })
  })
})

describe('getControllerApiEndpoint', () => {
  it('stays at the origin root even when the UI is served under /ui/', () => {
    vi.stubEnv('VITE_UI_MODE', 'controller')
    vi.stubEnv('DEV', false)
    servedFrom('/ui/')

    expect(getControllerApiEndpoint()).toBe(`${ORIGIN}/api`)
  })
})
