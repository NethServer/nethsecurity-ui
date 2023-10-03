//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

interface validationOutput {
  valid: Boolean
  errMessage?: String
  i18Params?: Object
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

export const validateIpv4SubnetMask = (subnetMask: String): validationOutput => {
  const re =
    /^(((255\.){3}(255|254|252|248|240|224|192|128|0+))|((255\.){2}(255|254|252|248|240|224|192|128|0+)\.0)|((255\.)(255|254|252|248|240|224|192|128|0+)(\.0+){2})|((255|254|252|248|240|224|192|128|0+)(\.0+){3}))$/

  const match = subnetMask.match(re)

  if (!match) {
    return { valid: false, errMessage: 'error.invalid_ip_v4_subnet_mask' }
  }
  return { valid: true }
}

export const validateIpv4Mtu = (mtu: String): validationOutput => {
  // mtu: maximum transmission unit

  const mtuNum = Number(mtu)

  if (isNaN(mtuNum) || !Number.isInteger(mtuNum) || mtuNum < 576 || mtuNum > 9200) {
    return { valid: false, errMessage: 'error.invalid_ip_v4_mtu' }
  }
  return { valid: true }
}

export const validateIpv6Mtu = (mtu: String): validationOutput => {
  // mtu: maximum transmission unit

  const mtuNum = Number(mtu)

  if (isNaN(mtuNum) || !Number.isInteger(mtuNum) || mtuNum < 1280 || mtuNum > 9200) {
    return { valid: false, errMessage: 'error.invalid_ip_v4_mtu' }
  }
  return { valid: true }
}

export const validateHexadecimalString = (hexValue: String): validationOutput => {
  const re = /^([a-f0-9][a-f0-9]|[A-F0-9][A-F0-9])+$/
  const match = hexValue.match(re)

  if (!match) {
    return { valid: false, errMessage: 'error.invalid_hexadecimal_string' }
  }
  return { valid: true }
}

export const validateUciName = (value: String, maxLength = 0): validationOutput => {
  // only alphanumeric and underscore characters allowed
  const re = /^[a-zA-Z0-9_]+$/

  const match = value.match(re)

  if (!match) {
    return { valid: false, errMessage: 'error.invalid_uci_name' }
  }

  if (maxLength && value.length > maxLength) {
    return {
      valid: false,
      errMessage: 'error.maximum_num_characters_allowed',
      i18Params: { num: maxLength }
    }
  }
  return { valid: true }
}

export const validateVlanId = (value: String): validationOutput => {
  const vlanId = Number(value)

  if (isNaN(vlanId) || !Number.isInteger(vlanId) || vlanId < 1 || vlanId > 4094) {
    return { valid: false, errMessage: 'error.invalid_vlan_id' }
  }
  return { valid: true }
}

/**
 * Extends Map class to provide a name-array for errors
 */
export class MessageBag extends Map<string, Array<string>> {
  set(key: string, value: Array<string>): this {
    if (!this.has(key)) {
      super.set(key, new Array<string>())
    }
    this.get(key)!.push(...value)
    return this
  }

  /**
   * Returns the first error message for the key, empty string if there's no message.
   * @param key
   */
  getFirstFor(key: string): string {
    return this.get(key)?.[0] ?? ''
  }

  /**
   * Returns the i18n key associate to the first error message for the key (if any).
   * @param key key of the messageBag, e.g. 'zoneName'
   * @param prefix string prefix to build the i18n key, e.g. 'standalone.zones_and_policies'
   */
  getFirstI18nKeyFor(key: string, prefix: string): string {
    if (this.has(key)) {
      return `${prefix}.${this.getFirstFor(key)}`
    }
    return ''
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
