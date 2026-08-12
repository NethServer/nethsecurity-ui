//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Where this bundle is deployed. Two separate questions: which app was built (VITE_UI_MODE), and
 * whether it is being served under a controller's path prefix (the document path).
 *
 * Imports nothing on purpose — used by lib/config.ts and lib/standalone/ubus.ts, which must not
 * pull in a pinia store.
 */

/** Which bundle was built. Says nothing about where it is served from. */
export const isStandaloneBuild = (): boolean => import.meta.env.VITE_UI_MODE === 'standalone'

/**
 * Deployment path, always slash-terminated: `/` on the unit's own nginx, `/<uuid>/` when proxied
 * by a controller. From `document.baseURI` so `/<uuid>/index.html` normalises and the hash route
 * cannot change it. Do not add a `<base>` tag to index.html.
 *
 * Only correct when the document path ends in a slash — otherwise this returns `/` and the unit's
 * UI would call the controller's API with the unit's token. Unfixable here (the browser has
 * already resolved the asset URLs), so it is guaranteed server-side by `m<uuid>-addslash` in
 * nethsecurity-controller's `vpn/handle-connection`. Traefik has no such redirect by default.
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
 * Driving a unit for a controller: proxied under /<uuid>/, or the controller bundle rendering the
 * legacy embedded route. Use for UX affordances; use isStandaloneBuild() for code paths.
 */
export const isManagedByController = (): boolean => !isStandaloneBuild() || isProxiedByController()

/**
 * Whether a probe response came from the unit's api-server. Status alone lies: while the unit is
 * down the controller's catch-all answers with 200 and HTML. Any JSON counts, including a 401 —
 * it proves the api-server is up.
 */
export const isUnitApiResponse = (contentType: string | null): boolean =>
  contentType?.includes('application/json') ?? false

/**
 * Unit id from a per-unit API URL: `https://ctrl/<uuid>/api/ubus/call` -> `<uuid>`. undefined when
 * there is no unit segment. A parse, not a regex — the regex this replaced returned null on other
 * shapes and then threw inside the interceptor, swallowing the original error.
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
