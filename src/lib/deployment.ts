//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Where and how this bundle is deployed.
 *
 * Two orthogonal questions live here and must not be conflated:
 *
 *  - "which app am I?" is decided at *build* time by VITE_UI_MODE (`isStandaloneBuild`)
 *  - "am I driving a unit on behalf of a controller?" is decided at *runtime* by the path the
 *    document was served under (`isProxiedByController`)
 *
 * The standalone bundle is served both by the unit's own nginx at `/` and, through the
 * controller's reverse proxy, at `/<unit-uuid>/`. It is the same build in both cases, so the
 * only way to tell them apart is the document path.
 *
 * This module deliberately imports nothing: it is used by `lib/config.ts` and
 * `lib/standalone/ubus.ts`, which must not depend on a pinia store.
 */

/**
 * True when this bundle was built as the standalone (per-unit) UI rather than the controller UI.
 * Build-time only — it says nothing about where the bundle is being served from.
 */
export const isStandaloneBuild = (): boolean => import.meta.env.VITE_UI_MODE === 'standalone'

/**
 * Path prefix the SPA is deployed under, always with a leading and a trailing slash:
 *
 *  - `/`         the unit's own nginx, or the controller UI at the site root
 *  - `/<uuid>/`  the unit's UI reached through the controller's per-unit proxy route
 *
 * Derived from the document rather than from `location.pathname` so that `/<uuid>/index.html`
 * normalises to `/<uuid>/` and so that hash navigation cannot change the answer. There is no
 * `<base>` tag in index.html — do not add one, it would silently redefine this.
 *
 * Note this is only correct when the document path ends in a slash: at `https://host/<uuid>`
 * (no slash) the browser resolves relative URLs against `https://host/`, so this returns `/` —
 * and the unit's UI would then talk to the controller's API.
 *
 * Nothing client-side can recover from that, because the browser has already resolved the asset
 * URLs against the wrong base before any of this code runs. It is prevented server-side instead:
 * the controller's per-unit route redirects `/<uuid>` to `/<uuid>/` before the document is ever
 * served (`m<uuid>-addslash` in nethsecurity-controller's `vpn/handle-connection`). Traefik has
 * no such redirect of its own — do not assume this is handled for you.
 */
export const getUiBasePath = (): string => {
  const path = new URL('.', document.baseURI).pathname
  return path.endsWith('/') ? path : `${path}/`
}

/**
 * True when the standalone bundle is served under a controller path prefix.
 *
 * Gated on `isStandaloneBuild()` on purpose: the controller UI is itself served at both `/` and
 * `/ui/`, and without the gate it would read `ui` as a unit id.
 */
export const isProxiedByController = (): boolean => isStandaloneBuild() && getUiBasePath() !== '/'

/** The unit id taken from the deployment path, or '' when not proxied. */
export const getProxiedUnitId = (): string =>
  isProxiedByController() ? (getUiBasePath().split('/')[1] ?? '') : ''

/**
 * True when this UI is driving a unit for a controller, whether by being proxied under
 * `/<uuid>/` or by being the controller bundle rendering the legacy embedded
 * `/controller/manage/:unitId` route.
 *
 * Use this for user-facing affordances (hidden sections, disabled menu entries, badges). Use
 * `isStandaloneBuild()` for code paths that differ between the two bundles.
 */
export const isManagedByController = (): boolean => !isStandaloneBuild() || isProxiedByController()

/**
 * Whether a probe response actually came from the unit's own api-server.
 *
 * Needed because a plain "did it respond?" check lies when a controller is in front. While the
 * unit is down its proxy route disappears and the controller's catch-all answers instead, with
 * HTTP 200 and an HTML body — so status alone would report the unit back online immediately, and
 * a reload at that moment would load the controller's SPA into the unit's tab.
 *
 * Only the unit's api-server answers JSON on these paths, so the content type is the signal. Any
 * JSON reply counts, including a 401: it proves the api-server is up, which is all a
 * post-reboot probe needs to know.
 */
export const isUnitApiResponse = (contentType: string | null): boolean =>
  contentType?.includes('application/json') ?? false

/**
 * Unit id embedded in a per-unit API URL, e.g. `https://ctrl/<uuid>/api/ubus/call` -> `<uuid>`.
 * Returns undefined when the URL carries no unit segment (`/api/ubus/call`) or cannot be parsed.
 *
 * Used by the controller's response interceptor to work out whose token to discard on a 401.
 * Deliberately a parse rather than a regex over the whole URL: the previous regex returned null
 * for any other shape, and reading `.length` off that threw *inside* the interceptor, swallowing
 * the original error.
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
