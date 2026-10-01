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
    return `/standalone`
  } else {
    // controller bundle rendering the legacy embedded route
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
