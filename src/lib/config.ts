//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { useUnitsStore } from '@/stores/controller/units'
import { getUiBasePath, isProxiedByController, isStandaloneBuild } from '@/lib/deployment'

export { isStandaloneBuild } from '@/lib/deployment'

/**
 * API endpoint of the unit this UI is managing.
 *
 * The standalone bundle is served from two places and must reach the same unit from both:
 * from the unit's own nginx at `/`, and through the controller's per-unit proxy route at
 * `/<uuid>/`. Deriving the base from the document path covers both without the UI having to
 * know which one it is in — `/api` at the root, `/<uuid>/api` behind the proxy.
 */
export const getStandaloneApiEndpoint = () => {
  if (!isStandaloneBuild()) {
    // the controller bundle rendering the legacy embedded /controller/manage/:unitId route
    return getUnitManagementApiEndpoint()
  }

  if (import.meta.env.DEV) {
    // standalone development environment
    const apiScheme = import.meta.env.VITE_API_SCHEME

    if (isProxiedByController()) {
      // `npm run dev -- --base=/<uuid>/` against a real controller
      return `${apiScheme}://${import.meta.env.VITE_CONTROLLER_API_HOST}${getUiBasePath()}api`
    }
    return `${apiScheme}://${import.meta.env.VITE_STANDALONE_API_HOST}/api`
  }

  // standalone production environment
  return `${window.location.origin}${getUiBasePath()}api`
}

/**
 * API endpoint of the controller itself.
 *
 * Deliberately origin-based rather than derived from the deployment path: the controller API is
 * mounted at the absolute `/api` by the controller's proxy, regardless of whether the controller
 * UI is served at `/` or at `/ui/`. Serving the controller itself under a path prefix is not
 * supported.
 */
export const getControllerApiEndpoint = () => {
  if (import.meta.env.DEV) {
    // controller development environment

    const apiScheme = import.meta.env.VITE_API_SCHEME
    const controllerApiHost = import.meta.env.VITE_CONTROLLER_API_HOST
    return `${apiScheme}://${controllerApiHost}/api`
  }

  // controller production environment
  return `${window.location.origin}/api`
}

/**
 * API endpoint of a specific unit, addressed through the controller's proxy.
 *
 * Only used by the controller bundle: either for its controller-native per-unit calls, or by the
 * legacy embedded route that renders StandaloneApp inside the controller shell. The proxied
 * standalone bundle goes through `getStandaloneApiEndpoint()` instead.
 */
export const getUnitManagementApiEndpoint = (unitId?: string) => {
  const unitsStore = useUnitsStore()
  // in case of "Open unit" unitsStore.unitId is used
  const currentUnitId = unitId || unitsStore.unitId

  if (import.meta.env.DEV) {
    // controller development environment

    const apiScheme = import.meta.env.VITE_API_SCHEME
    const controllerApiHost = import.meta.env.VITE_CONTROLLER_API_HOST
    return `${apiScheme}://${controllerApiHost}/${currentUnitId}/api`
  }

  return `${window.location.origin}/${currentUnitId}/api`
}

export const getProductName = () => {
  // @ts-expect-error branding.js should be always be present
  return window.BRANDING.PRODUCT_NAME
}

export const getProductUrl = () => {
  // @ts-expect-error branding.js should be always be present
  return window.BRANDING.PRODUCT_URL
}

export const getCompanyName = () => {
  // @ts-expect-error branding.js should be always be present
  return window.BRANDING.COMPANY_NAME
}

export const getCompanyUrl = () => {
  // @ts-expect-error branding.js should be always be present
  return window.BRANDING.COMPANY_URL
}

export const getDocsUrl = () => {
  // @ts-expect-error branding.js should be always be present
  return window.BRANDING.DOCS_URL
}

export const getHelpdeskUrl = () => {
  // @ts-expect-error branding.js should be always be present
  return window.BRANDING.HELPDESK_URL
}

export const getPrivacyPolicyUrl = () => {
  // @ts-expect-error branding.js should be always be present
  return window.BRANDING.PRIVACY_POLICY_URL
}
