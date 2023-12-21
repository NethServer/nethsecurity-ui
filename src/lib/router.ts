//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { isStandaloneMode } from './config'
import { useUnitManagementStore } from '@/stores/controller/unitManagement'

/**
 * Used in <router-link> elements of standalone UI to build the full path of destination page
 *
 */
export const getStandaloneRoutePrefix = () => {
  if (isStandaloneMode()) {
    // standalone
    return `/standalone`
  } else {
    // a controller is managing this unit
    const unitManagementStore = useUnitManagementStore()
    return `/controller/manage/${unitManagementStore.unitName}`
  }
}

/**
 * Used in <router-link> elements of controller UI to build the full path of destination page
 *
 */
export const getControllerRoutePrefix = () => {
  //// call this function in controller menu items
  return `/controller`
}
