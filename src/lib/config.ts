//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { useUnitsStore } from '@/stores/controller/units'

export const isStandaloneMode = () => {
  return import.meta.env.VITE_UI_MODE === 'standalone'
}

export const getStandaloneApiEndpoint = () => {
  if (!isStandaloneMode()) {
    // a controller is managing this unit
    return getUnitManagementApiEndpoint()
  }

  if (import.meta.env.DEV) {
    // standalone development environment

    const apiScheme = import.meta.env.VITE_API_SCHEME
    const standaloneApiHost = import.meta.env.VITE_STANDALONE_API_HOST
    return `${apiScheme}://${standaloneApiHost}/api`
  } else {
    // standalone production environment

    return (
      window.location.protocol +
      '//' +
      window.location.hostname +
      (window.location.port ? ':' + window.location.port : '') +
      '/api'
    )
  }
}

export const getControllerApiEndpoint = () => {
  if (import.meta.env.DEV) {
    // controller development environment

    const apiScheme = import.meta.env.VITE_API_SCHEME
    const controllerApiHost = import.meta.env.VITE_CONTROLLER_API_HOST
    return `${apiScheme}://${controllerApiHost}/api`
  } else {
    // controller production environment

    return (
      window.location.protocol +
      '//' +
      window.location.hostname +
      (window.location.port ? ':' + window.location.port : '') +
      '/api'
    )
  }
}

export const getUnitManagementApiEndpoint = () => {
  const unitManagementStore = useUnitsStore()

  if (import.meta.env.DEV) {
    // controller development environment

    const apiScheme = import.meta.env.VITE_API_SCHEME
    const controllerApiHost = import.meta.env.VITE_CONTROLLER_API_HOST

    // include unit name in endpoint
    const unitId = unitManagementStore.unitId
    return `${apiScheme}://${controllerApiHost}/${unitId}/api`
  } else {
    // include unit name in endpoint
    const unitId = unitManagementStore.unitId
    return (
      window.location.protocol +
      '//' +
      window.location.hostname +
      (window.location.port ? ':' + window.location.port : '') +
      `/${unitId}/api`
    )
  }
}

export const getProductName = () => {
  // @ts-ignore
  return window.BRANDING.PRODUCT_NAME
}

export const getProductUrl = () => {
  // @ts-ignore
  return window.BRANDING.PRODUCT_URL
}

export const getCompanyName = () => {
  // @ts-ignore
  return window.BRANDING.COMPANY_NAME
}

export const getCompanyUrl = () => {
  // @ts-ignore
  return window.BRANDING.COMPANY_URL
}

export const getDocsUrl = () => {
  // @ts-ignore
  return window.BRANDING.DOCS_URL
}

export const getHelpdeskUrl = () => {
  // @ts-ignore
  return window.BRANDING.HELPDESK_URL
}
