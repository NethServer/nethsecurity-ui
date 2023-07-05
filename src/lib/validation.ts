//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

interface validationOutput {
  valid: Boolean
  errMessage?: String
}

//// move to vue-tailwind library?

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

export const validateIp6Address = (ipAddr: String): validationOutput => {
  //// TODO
  return { valid: false, errMessage: 'error.invalid_ip_v6_address' }
}
