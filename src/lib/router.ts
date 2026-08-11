//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { useRoute, type RouteLocationNormalizedLoaded } from 'vue-router'
import { isStandaloneBuild } from './config'

/**
 * Used in <router-link> elements of standalone UI to build the full path of destination page. 'route' input param is sometimes needed (e.g. from goTo() function in StandaloneDashboardView.vue)
 *
 */
export const getStandaloneRoutePrefix = (route?: RouteLocationNormalizedLoaded) => {
  if (!route) {
    route = useRoute()
  }

  if (isStandaloneBuild()) {
    // Standalone, whether served by the unit itself or proxied by a controller at /<uuid>/.
    // Deliberately NOT unit-aware: the unit id lives in the URL *path*, and the router uses hash
    // history with no explicit base, so it derives that base from location.pathname. Generated
    // links therefore come out as /<uuid>/#/standalone/... on their own. Making this
    // unit-aware would double the prefix.
    return `/standalone`
  } else {
    // the controller bundle rendering the legacy embedded route, where the unit is a route param
    // a controller is managing this unit
    return `/controller/manage/${route.params.unitId}`
  }
}

/**
 * Used in <router-link> elements of controller UI to build the full path of destination page
 *
 */
export const getControllerRoutePrefix = () => {
  // call this function in controller menu items
  return `/controller`
}
