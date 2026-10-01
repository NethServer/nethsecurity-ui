//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { getPreference, savePreference } from '@nethesis/vue-components'
import { getProxiedUnitId, isProxiedByController } from '@/lib/deployment'

/**
 * Local storage keys, scoped to the deployment. localStorage is partitioned by origin
 * so proxied unit UIs at `/<uuid>/` share one namespace on the controller's, separation
 * is needed so that UI's don't read each other stuff.
 */

/**
 * Session key: `standaloneLoginInfo` at the root, `unit-<uuid>` when proxied — the same handoff
 * key `retrieveAndSaveUnitToken()` writes.
 *
 * @param managedUnitId for the controller bundle's embedded route, where the unit is a route
 *   param rather than a path prefix. Wins over the path.
 */
export const getSessionStorageKey = (managedUnitId?: string): string => {
  const unitId = managedUnitId || (isProxiedByController() ? getProxiedUnitId() : '')
  return unitId ? `unit-${unitId}` : 'standaloneLoginInfo'
}

/** Scopes any other key to the unit, so N proxied unit UIs on one origin cannot collide. */
export const getScopedStorageKey = (key: string): string =>
  isProxiedByController() ? `unit-${getProxiedUnitId()}.${key}` : key

/**
 * Scopes the username preferences are keyed on: two units both logged in as `root` would otherwise
 * share `preferences-root`, leaking theme, locale and menu state between them.
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
