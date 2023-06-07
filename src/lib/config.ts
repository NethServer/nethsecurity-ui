//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

export const getStandaloneApiEndpoint = () => {
  if (import.meta.env.VITE_STANDALONE_API_ENDPOINT) {
    return import.meta.env.VITE_STANDALONE_API_ENDPOINT
  } else {
    // production environment
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
  if (import.meta.env.VITE_CONTROLLER_API_ENDPOINT) {
    return import.meta.env.VITE_CONTROLLER_API_ENDPOINT
  } else {
    // production environment
    return (
      window.location.protocol +
      '//' +
      window.location.hostname +
      (window.location.port ? ':' + window.location.port : '') +
      '/api'
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
