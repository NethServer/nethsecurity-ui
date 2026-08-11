//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { getPreference, savePreference } from '@nethesis/vue-components'
import { getProxiedUnitId, isProxiedByController } from '@/lib/deployment'

/**
 * Local storage keys, scoped to the deployment.
 *
 * localStorage is partitioned by *origin*, not by path. When the controller proxies unit UIs at
 * `/<uuid>/`, every unit UI and the controller UI itself share one namespace, so an unscoped key
 * written by unit A is read back by unit B. Two unit tabs open at once is the normal workflow, so
 * this is not a corner case.
 *
 * Everything here is a no-op unless the standalone bundle is being proxied, which is what makes
 * the call sites safe to swap wholesale: on a unit serving its own UI, and in the controller
 * bundle, the keys are exactly what they were.
 */

/**
 * Key holding this UI's session, for all three deployments:
 *
 *  - unit serving its own UI at `/`      -> `standaloneLoginInfo`
 *  - unit proxied by a controller        -> `unit-<uuid>`, uuid taken from the path
 *  - controller bundle, embedded route   -> `unit-<uuid>`, uuid passed in from the route param
 *
 * The `unit-<uuid>` form is the same key the controller writes in `retrieveAndSaveUnitToken()`.
 * That is deliberate: it *is* the handoff contract. A proxied UI picks up the session the
 * controller minted for it instead of prompting for credentials the operator does not have.
 *
 * @param managedUnitId unit id from the route, for the controller bundle's embedded route, where
 *   the unit is a route param rather than a path prefix. Wins over the path when given.
 */
export const getSessionStorageKey = (managedUnitId?: string): string => {
  const unitId = managedUnitId || (isProxiedByController() ? getProxiedUnitId() : '')
  return unitId ? `unit-${unitId}` : 'standaloneLoginInfo'
}

/** Scopes any other key to the unit, so N proxied unit UIs on one origin cannot collide. */
export const getScopedStorageKey = (key: string): string =>
  isProxiedByController() ? `unit-${getProxiedUnitId()}.${key}` : key

/**
 * Scopes the username that `savePreference`/`getPreference` key on.
 *
 * Without this, two units both authenticating as `root` share `preferences-root`, so theme,
 * locale and every expanded-menu flag leak between units — and between units and the controller
 * when the controller admin is also called `root`.
 */
export const getPreferencesScope = (username: string): string =>
  isProxiedByController() ? `${getProxiedUnitId()}:${username}` : username

/** `savePreference`, scoped to the deployment. Use instead of the library function directly. */
export const saveUiPreference = (
  preferenceName: string,
  preferenceValue: unknown,
  username: string
): void => savePreference(preferenceName, preferenceValue, getPreferencesScope(username))

/** `getPreference`, scoped to the deployment. Use instead of the library function directly. */
export const getUiPreference = (preferenceName: string, username: string) =>
  getPreference(preferenceName, getPreferencesScope(username))
