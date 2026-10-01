//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Where this bundle is deployed: which app was built (VITE_UI_MODE) and whether it's served under
 * a controller's path prefix. No imports — used by lib/config.ts and lib/standalone/ubus.ts, which
 * must not pull in a pinia store.
 */

/** Which bundle was built. Says nothing about where it is served from. */
export const isStandaloneBuild = (): boolean => import.meta.env.VITE_UI_MODE === 'standalone'

/**
 * Deployment path, always slash-terminated: `/` on the unit's own nginx, `/<uuid>/` when proxied.
 * From `document.baseURI`, ignoring the hash route. Do not add a `<base>` tag to index.html.
 *
 * Must end in a slash or this silently returns `/` (wrong API host) — guaranteed server-side by
 * `m<uuid>-addslash` in nethsecurity-controller's `vpn/handle-connection`.
 */
export const getUiBasePath = (): string => {
  const path = new URL('.', document.baseURI).pathname
  return path.endsWith('/') ? path : `${path}/`
}

/** Gated on the build so the controller UI at /ui/ does not read `ui` as a unit id. */
export const isProxiedByController = (): boolean => isStandaloneBuild() && getUiBasePath() !== '/'

/** Unit id from the deployment path, or '' when not proxied. */
export const getProxiedUnitId = (): string =>
  isProxiedByController() ? (getUiBasePath().split('/')[1] ?? '') : ''

/**
 * True when a controller manages this unit (proxied, or the legacy embedded route). UX only — use
 * isStandaloneBuild() for code paths.
 */
export const isManagedByController = (): boolean => !isStandaloneBuild() || isProxiedByController()

/**
 * Whether a probe response came from the unit's api-server, not the controller's catch-all (which
 * answers 200/HTML while the unit is down). Any JSON counts, even a 401.
 */
export const isUnitApiResponse = (contentType: string | null): boolean =>
  contentType?.includes('application/json') ?? false

/**
 * Unit id from a per-unit API URL: `https://ctrl/<uuid>/api/ubus/call` -> `<uuid>`, or undefined.
 * Parses instead of using a regex — the previous regex returned null on some shapes and threw
 * inside the interceptor, swallowing the real error.
 */
export const getUnitIdFromApiUrl = (url: string): string | undefined => {
  let pathname: string
  try {
    pathname = new URL(url, window.location.origin).pathname
  } catch {
    return undefined
  }

  const segments = pathname.split('/').filter(Boolean)
  const apiIndex = segments.lastIndexOf('api')
  return apiIndex > 0 ? segments[apiIndex - 1] : undefined
}
