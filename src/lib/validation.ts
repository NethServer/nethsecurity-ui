//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

interface validationOutput {
  valid: Boolean
  errMessage?: String
}

//// move general purpose functions to vue-tailwind library?

export const validateRequired = (value: String): validationOutput => {
  if (value) {
    return { valid: true }
  }
  return { valid: false, errMessage: 'error.required' }
}

export const validateHostname = (hostname: String): validationOutput => {
  if (hostname.length <= 253) {
    const isValid =
      hostname.match(/^[a-zA-Z0-9_]+$/) != null ||
      (hostname.match(/^[a-zA-Z0-9_][a-zA-Z0-9_\-.]*[a-zA-Z0-9]$/) && hostname.match(/[^0-9.]/))

    if (isValid) {
      return { valid: true }
    } else {
      return { valid: false, errMessage: 'error.invalid_hostname' }
    }
  }
  return { valid: false, errMessage: 'error.hostname_is_too_long' }
}

export const validateHost = (host: String): validationOutput => {
  const validHostname = validateHostname(host)

  if (validHostname.valid) {
    return { valid: true }
  }

  const validIpAddress = validateIpAddress(host)

  if (validIpAddress.valid) {
    return { valid: true }
  }
  return { valid: false, errMessage: 'error.invalid_host' }
}

export const validateIpAddress = (ipAddr: String): validationOutput => {
  const validIp4Addr = validateIp4Address(ipAddr)

  if (validIp4Addr.valid) {
    return { valid: true }
  }

  const validIp6Addr = validateIp6Address(ipAddr)

  if (validIp6Addr.valid) {
    return { valid: true }
  }
  return { valid: false, errMessage: 'error.invalid_ip_address' }
}

export const validateIp4Address = (ipAddr: String): validationOutput => {
  const re = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = ipAddr.match(re)

  if (!match) {
    return { valid: false, errMessage: 'error.invalid_ip_v4_address' }
  }

  if (
    Number(match[1]) > 255 ||
    Number(match[2]) > 255 ||
    Number(match[3]) > 255 ||
    Number(match[4]) > 255
  ) {
    return { valid: false, errMessage: 'error.invalid_ip_v4_address' }
  }

  return { valid: true }
}

export const validateIp4Cidr = (ip4Cidr: String): validationOutput => {
  const re = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/
  const match = ip4Cidr.match(re)

  if (!match) {
    return { valid: false, errMessage: 'error.invalid_cidr_v4_address' }
  }

  if (
    Number(match[1]) > 255 ||
    Number(match[2]) > 255 ||
    Number(match[3]) > 255 ||
    Number(match[4]) > 255 ||
    Number(match[5]) > 32
  ) {
    return { valid: false, errMessage: 'error.invalid_cidr_v4_address' }
  }

  return { valid: true }
}

export const validateIp6Cidr = (ip4Cidr: String): validationOutput => {
  const re =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(?:12[0-8]|1[01][0-9]|[1-9]?[0-9])$/
  const match = ip4Cidr.match(re)

  if (!match) {
    return { valid: false, errMessage: 'error.invalid_cidr_v6_address' }
  }
  return { valid: true }
}

export const validateIp6Address = (ipAddr: String): validationOutput => {
  const re =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/

  const match = ipAddr.match(re)

  if (!match) {
    return { valid: false, errMessage: 'error.invalid_ip_v6_address' }
  }
  return { valid: true }
}

export const validateUciName = (ipAddr: String): validationOutput => {
  // only alphanumeric and underscore characters allowed
  const re = /^[a-zA-Z0-9_]+$/

  const match = ipAddr.match(re)

  if (!match) {
    return { valid: false, errMessage: 'error.invalid_uci_name' }
  }
  return { valid: true }
}

/**
 * Extends Map class to provide a name-array for errors
 */
export class MessageBag extends Map<string, Array<string>> {
  set(key: string, value: Array<string>): this {
    if (!super.has(key)) {
      super.set(key, new Array<string>())
    }
    super.get(key)!.push(...value)
    return this
  }
}

/**
 * Error class for validation errors
 */
export class ValidationError extends Error {
  constructor() {
    super('error.validation_failed')
  }
}
