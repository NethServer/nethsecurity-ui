//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

export const getApiEndpoint = () => {
  if (import.meta.env.VITE_API_ENDPOINT) {
    return import.meta.env.VITE_API_ENDPOINT
  } else {
    // production environment
    return (
      window.location.hostname +
      (window.location.port ? ':' + window.location.port : '') +
      window.location.pathname +
      'api'
    )
  }
}

export const getApiScheme = () => {
  if (import.meta.env.VITE_API_SCHEME) {
    return import.meta.env.VITE_API_SCHEME
  } else {
    // production environment
    return window.location.protocol + '//'
  }
}

export const getProductName = () => {
  return import.meta.env.VITE_PRODUCT_NAME
}

export const getProductUrl = () => {
  return import.meta.env.VITE_PRODUCT_URL
}

export const getCompanyName = () => {
  return import.meta.env.VITE_COMPANY_NAME
}

export const getCompanyUrl = () => {
  return import.meta.env.VITE_COMPANY_URL
}

export const getDocsUrl = () => {
  return import.meta.env.VITE_DOCS_URL
}

export const getHelpdeskUrl = () => {
  return import.meta.env.VITE_HELPDESK_URL
}
