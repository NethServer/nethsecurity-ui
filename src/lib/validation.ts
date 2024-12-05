//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { type NeComboboxOption } from '@nethesis/vue-components'

export interface validationOutput {
  valid: Boolean
  errMessage?: String
  i18Params?: Object
}

/**
 * Validate a string against a list of validation functions.
 * Input value is considered valid if it satisfies at least one of the validators.
 *
 * @param validators list of validation functions
 * @param value string to validate
 * @param errMessage the error message to return if the value is invalid
 * @returns a validationOutput object
 */
export const validateAnyOf = (
  validators: Function[],
  value: String,
  errMessage: String
): validationOutput => {
  for (const validator of validators) {
    const validation = validator(value)

    if (validation.valid) {
      return { valid: true }
    }
  }
  return { valid: false, errMessage }
}

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

export const validateDomainName = (value: String): validationOutput => {
  const isValid =
    value.match(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/) != null

  if (isValid) {
    return { valid: true }
  } else {
    return { valid: false, errMessage: 'error.invalid_domain_name' }
  }
}

export const validateMacAddress = (macAddress: String): validationOutput => {
  const isValid = macAddress.match(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/) != null

  if (isValid) {
    return { valid: true }
  } else {
    return { valid: false, errMessage: 'error.invalid_mac_address' }
  }
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

// validate ip address, cidr network, hostnames or domains
export const validateAddress = (value: string): validationOutput => {
  if (
    !validateIpOrCidr(value).valid &&
    !validateFQDN(value, false).valid &&
    !validateMacAddress(value).valid &&
    !validateHostname(value).valid
  ) {
    return { valid: false, errMessage: 'error.invalid_address' }
  }

  return { valid: true }
}

/**
 * Validate a range of IPv4 or IPv6 addresses
 *
 * Examples of valid values:
 * - 10.20.30.40-10.20.30.50
 * - 192.168.100.1-192.168.100.255
 * - 1762::B03:1:AF10-1762::B03:1:AF30
 * - 2001:db8::2:1-2001:db8::2:9
 *
 * @param value string to validate
 * @returns a validationOutput object
 */
export const validateIpAddressRange = (value: String): validationOutput => {
  if (!validateIp4AddressRange(value).valid && !validateIp6AddressRange(value).valid) {
    return { valid: false, errMessage: 'error.invalid_ip_address_range' }
  }
  return { valid: true }
}

/**
 * Validate a range of IPv4 addresses
 *
 * Examples of valid values:
 * - 10.20.30.40-10.20.30.50
 * - 192.168.100.1-192.168.100.255
 *
 * @param value string to validate
 * @returns a validationOutput object
 */
export const validateIp4AddressRange = (value: String): validationOutput => {
  if (!value.includes('-')) {
    return { valid: false, errMessage: 'error.invalid_ip_v4_address_range' }
  }

  const range = value.split('-')
  if (range.length != 2) {
    return { valid: false, errMessage: 'error.invalid_ip_v4_address_range' }
  }

  for (const ip_addr of range) {
    const validation = validateIp4Address(ip_addr)
    if (!validation.valid) {
      return { valid: false, errMessage: validation.errMessage }
    }
  }
  return { valid: true }
}

/**
 * Validate a range of IPv6 addresses
 *
 * Examples of valid values:
 * - 1762::B03:1:AF10-1762::B03:1:AF30
 * - 2001:db8::2:1-2001:db8::2:9
 *
 * @param value string to validate
 * @returns a validationOutput object
 */
export const validateIp6AddressRange = (value: String): validationOutput => {
  if (!value.includes('-')) {
    return { valid: false, errMessage: 'error.invalid_ip_v6_address_range' }
  }

  const range = value.split('-')
  if (range.length != 2) {
    return { valid: false, errMessage: 'error.invalid_ip_v6_address_range' }
  }

  for (const ip_addr of range) {
    const validation = validateIp6Address(ip_addr)
    if (!validation.valid) {
      return { valid: false, errMessage: validation.errMessage }
    }
  }
  return { valid: true }
}

/**
 * Validate an IPv4 address
 *
 * Examples of valid values:
 * - 10.20.30.40
 * - 192.168.100.1-192.168.100.123
 *
 * @param ipAddr string to validate
 * @returns a validationOutput object
 */
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

export const validateIp4OrCidr = (value: string): validationOutput => {
  if (!validateIp4Address(value).valid && !validateIp4Cidr(value).valid) {
    return { valid: false, errMessage: 'error.invalid_ip_v4_address_or_cidr' }
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

export const validateIpCidr = (ipCidr: string): validationOutput => {
  if (!validateIp4Cidr(ipCidr).valid && !validateIp6Cidr(ipCidr).valid) {
    return { valid: false, errMessage: 'error.invalid_cidr_address' }
  }

  return { valid: true }
}

export const validateIpOrCidr = (value: string): validationOutput => {
  if (!validateIpAddress(value).valid && !validateIpCidr(value).valid) {
    return { valid: false, errMessage: 'error.invalid_ip_address_or_cidr' }
  }

  return { valid: true }
}

/**
 * Validate an IPv6 address
 *
 * Examples of valid values:
 * - 1762::B03:1:AF10
 * - 2001:db8:0:0:0:0:2:1
 * - 2001:db8::2:9
 *
 * @param ipAddr string to validate
 * @returns a validationOutput object
 */
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
    return { valid: false, errMessage: 'error.invalid_ip_v6_mtu' }
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

export const validateAlphanumeric = (
  value: String,
  mustStartWithLetter = false
): validationOutput => {
  const re = mustStartWithLetter ? /^[a-zA-Z][a-zA-Z0-9]*$/ : /^[a-zA-Z0-9]+$/
  const match = value.match(re)

  if (!match) {
    const message = mustStartWithLetter
      ? 'error.invalid_alphanumeric_starting_with_letter'
      : 'error.invalid_alphanumeric'
    return { valid: false, errMessage: message }
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

export function validatePort(value: string, minPort = 1, maxPort = 65535): validationOutput {
  const port = +value

  if (Number.isNaN(port) || port < minPort || port > maxPort) {
    return { valid: false, errMessage: 'error.invalid_port' }
  }
  return { valid: true }
}

export function validatePortRangeForMwan(
  value: string,
  minRange = 1,
  maxRange = 65535
): validationOutput {
  let strings: string[]
  if (value.includes(',')) {
    strings = value.split(',')
  } else if (value.includes('-')) {
    strings = value.split('-')
  } else {
    strings = [value]
  }
  for (const port of strings) {
    const validation = validatePort(port, minRange, maxRange)
    if (!validation.valid) {
      return { valid: false, errMessage: 'error.invalid_port_or_port_range' }
    }
  }
  return { valid: true }
}

/**
 * Validate a port range
 *
 * Examples of valid values:
 * - 8080-8081
 * - 5100-5200
 *
 * @param value string to validate
 * @param minPort minimum port number
 * @param maxPort maximum port number
 * @returns a validationOutput object
 */
export function validatePortRange(value: string, minPort = 1, maxPort = 65535): validationOutput {
  if (!value.includes('-')) {
    return { valid: false, errMessage: 'error.invalid_port_range' }
  }

  const range = value.split('-')
  if (range.length != 2) {
    return { valid: false, errMessage: 'error.invalid_port_range' }
  }
  const start = Number.parseInt(range[0])
  const end = Number.parseInt(range[1])
  if (start > end) {
    return { valid: false, errMessage: 'error.invalid_port_range' }
  }

  for (const port of range) {
    const validation = validatePort(port, minPort, maxPort)
    if (!validation.valid) {
      return { valid: false, errMessage: validation.errMessage }
    }
  }
  return { valid: true }
}

/**
 * Validate a list of ports and/or port ranges.
 *
 * Examples of valid values:
 * - 8080
 * - 8080, 8081
 * - 5100-5200
 * - 8080, 5100-5200
 * - 8080, 5100-5200, 9090
 *
 * @param value string to validate
 * @param minPort minimum port number
 * @param maxPort maximum port number
 * @returns a validationOutput object
 */
export function validatePortListOrRange(
  value: string,
  minPort = 1,
  maxPort = 65535
): validationOutput {
  // remove whitespace
  value = value.replace(/\s/g, '')

  for (const portOrRange of value.split(',')) {
    if (portOrRange.includes('-')) {
      // port range

      const validation = validatePortRange(portOrRange, minPort, maxPort)
      if (!validation.valid) {
        return { valid: false, errMessage: 'error.invalid_port_range' }
      }
    } else {
      // single port

      const validation = validatePort(portOrRange, minPort, maxPort)
      if (!validation.valid) {
        return { valid: false, errMessage: 'error.invalid_port' }
      }
    }
  }
  return { valid: true }
}

export const validateRequiredOption = (value: NeComboboxOption[]): validationOutput => {
  if (value.length == 0) {
    return { valid: false, errMessage: 'error.required_option' }
  }
  return { valid: true }
}

export const validateLeaseTime = (value: string): validationOutput => {
  const re = /^([1-9][0-9]*[smhdw]|infinity)$/

  const match = value.match(re)

  if (!match) {
    return { valid: false, errMessage: 'error.invalid_lease_time' }
  }
  if (value != 'infinity') {
    const unit = value.charAt(value.length - 1)
    if (
      (unit === 's' && Number.parseInt(value.slice(0, value.length - 1)) < 120) ||
      (unit === 'm' && Number.parseInt(value.slice(0, value.length - 1)) < 2)
    ) {
      return { valid: false, errMessage: 'error.invalid_lease_time_duration' }
    }
  }
  return { valid: true }
}

export const validatePassword = (value: String): validationOutput => {
  if (value.length < 8) {
    return { valid: false, errMessage: 'error.password_too_short' }
  }
  if (!value.match(/[a-z]/)) {
    return { valid: false, errMessage: 'error.password_lowercase_required' }
  }
  if (!value.match(/[A-Z]/)) {
    return { valid: false, errMessage: 'error.password_uppercase_required' }
  }
  if (!value.match(/[0-9]/)) {
    return { valid: false, errMessage: 'error.password_number_required' }
  }
  if (!value.match(/[^a-zA-Z0-9]/)) {
    return { valid: false, errMessage: 'error.password_special_character_required' }
  }
  return { valid: true }
}

export const validateStringEqual = (value: String, otherValue: String): validationOutput => {
  if (value != otherValue) {
    return { valid: false, errMessage: 'error.invalid_equal' }
  }
  return { valid: true }
}

export const validateFile = (
  value: File | null,
  format: string | null = null
): validationOutput => {
  if (!value) {
    return { valid: false, errMessage: 'error.required_file' }
  }

  if (format) {
    const filenameSplit = value.name.split('.')

    if (filenameSplit.length < format.split('.').length) {
      return { valid: false, errMessage: 'error.invalid_file_format' }
    }

    const extension = filenameSplit
      .slice(filenameSplit.length - format.split('.').length, filenameSplit.length)
      .join('.')

    if (extension.toLowerCase() != format.toLowerCase()) {
      return { valid: false, errMessage: 'error.invalid_file_format' }
    }
  }

  return { valid: true }
}

export const validatePositiveInteger = (value: string): validationOutput => {
  // check if value contains any non-numeric characters
  if (/\D/.test(value)) {
    return { valid: false, errMessage: 'error.invalid_negative_integer' }
  }

  const intValue = Number.parseInt(value)

  if (intValue < 0) {
    return { valid: false, errMessage: 'error.invalid_negative_integer' }
  }
  return { valid: true }
}

export const validateFutureDate = (value: Date): validationOutput => {
  if (value.getTime() < new Date().getTime()) {
    return { valid: false, errMessage: 'error.invalid_future_date' }
  }
  return { valid: true }
}

export const validatePath = (value: string): validationOutput => {
  if (value[0] != '/') {
    return { valid: false, errMessage: 'error.invalid_path' }
  }
  return { valid: true }
}

export const validateFQDN = (value: string, acceptWildcard: boolean): validationOutput => {
  const re = acceptWildcard
    ? /(?=^.{4,253}$)(^(\*\.)?((?!-)[a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,63}$)/
    : /(?=^.{4,253}$)(^((?!-)[a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,63}$)/

  if (!value.match(re)) {
    return { valid: false, errMessage: 'error.invalid_fqdn' }
  }
  return { valid: true }
}

export const validateIpAddressOrFQDN = (value: string) => {
  const ipValidator = validateIpAddress(value)
  const fqdnValidator = validateFQDN(value, false)

  if (!ipValidator.valid && !fqdnValidator.valid) {
    return { valid: false, errMessage: 'error.invalid_ip_address_or_fqdn' }
  }

  return { valid: true }
}

export const validateURL = (value: string): validationOutput => {
  try {
    new URL(value)
    return { valid: true }
  } catch {
    return { valid: false, errMessage: 'error.invalid_url' }
  }
}

export const validateLDAPUri = (value: string): validationOutput => {
  const re = /^(ldap|ldaps):\/\/[^ "]+$/gi

  if (!value.match(re)) {
    return { valid: false, errMessage: 'error.invalid_url' }
  }
  return { valid: true }
}

export const validateDNSForwardingServer = (value: string): validationOutput => {
  const validResult = { valid: true }
  const invalidResult = { valid: false, errMessage: 'error.invalid_dns_forwarding' }

  const match = value.match(/^(\/.*\/)?(.*)$/)

  if (!match) {
    return invalidResult
  }

  // if the input is divided by slashes (i.e. /example.com/10.1.2.3),
  // we check if the first item between the slashes is a valid hostname
  // or hostname list (divided by slashes)
  if (match[1] && match[1] != '//' && match[1] != '/#/') {
    const addressList = match[1]

    const addressListMatch = addressList.match(/^\/(.+)\/$/)
    const names = addressListMatch ? match[1].split(/\//) : [addressList]

    for (let i = 0; i < names.length; i++) {
      if (!names[i]) {
        // skip empty strings caused by the split operation
        continue
      }

      const res = validateHostname(names[i])

      if (!res.valid) {
        return invalidResult
      }
    }
  }

  if (match[2] == '' || match[2] == '#') {
    return validResult
  }

  // ipaddr%scopeid#srvport@source@interface#srcport
  const ipAddrMatch = match[2].match(
    /^([0-9a-f:.]+)(?:%[^#@]+)?(?:#(\d+))?(?:@([0-9a-f:.]+)(?:@[^#]+)?(?:#(\d+))?)?$/
  )

  if (!ipAddrMatch) {
    return invalidResult
  }

  // validate ip addresses and port formats
  if (validateIp4Address(ipAddrMatch[1]).valid) {
    if (ipAddrMatch[3] && !validateIp4Address(ipAddrMatch[3]).valid) {
      return invalidResult
    }
  } else if (validateIp6Address(ipAddrMatch[1]).valid) {
    if (ipAddrMatch[3] && !validateIp6Address(ipAddrMatch[3]).valid) {
      return invalidResult
    }
  } else {
    return invalidResult
  }

  if (
    (ipAddrMatch[2] && !validatePort(ipAddrMatch[2]).valid) ||
    (ipAddrMatch[4] && !validatePort(ipAddrMatch[4]).valid)
  ) {
    return invalidResult
  }

  return validResult
}

/**
 * Validate if the string doesn't have spaces.
 * @param value
 */
export function validateNoSpaces(value: string): validationOutput {
  if (value.includes(' ')) {
    return { valid: false, errMessage: 'error.invalid_space' }
  }
  return { valid: true }
}

/**
 * Validate a 6-digit code
 *
 * * Examples of valid values:
 * - 123456
 * - 000000
 * - 357924
 *
 * @param value string to validate
 * @returns a validationOutput object
 */
export const validateSixDigitCode = (value: String): validationOutput => {
  if (value.length !== 6) {
    return { valid: false, errMessage: 'error.enter_six_digit_code' }
  }
  const re = /^\d{6}$/

  if (!value.match(re)) {
    return { valid: false, errMessage: 'error.enter_six_digit_code' }
  }
  return { valid: true }
}

export const validateSshKeyPassphrase = (value: String): validationOutput => {
  if (value.length < 8) {
    return { valid: false, errMessage: 'error.passphrase_too_short' }
  }

  return { valid: true }
}

/**
 * Extends Map class to provide a name-array for errors
 */
export class MessageBag extends Map<string, Array<string>> {
  set(key: string, value: Array<string> | string): this {
    if (typeof value === 'string') {
      value = [value]
    }
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
  getFirstI18nKeyFor(key: string): string {
    if (this.has(key)) {
      const i18nKey = this.getFirstFor(key)

      if (i18nKey.includes('.')) {
        // assume the i18nKey already contains the prefix, e.g. 'error.xyz'
        return i18nKey
      } else {
        // add 'error.' prefix to build the i18n key
        return `error.${i18nKey}`
      }
    }
    return ''
  }
}

/**
 * Returns a MessageBag object from an Axios error.
 */
export const getValidationErrorsFromAxiosError = (err: any): MessageBag => {
  const errorBag = new MessageBag()
  const validationErrors = err.response?.data?.data?.validation?.errors

  if (validationErrors) {
    validationErrors.forEach((validationError: any) => {
      const errorMessages = errorBag.get(validationError.parameter) || []
      errorMessages.push(validationError.message)
      errorBag.set(validationError.parameter, errorMessages)
    })
  }
  return errorBag
}

/**
 * Error class for validation errors
 */
export class ValidationError extends Error {
  constructor() {
    super('error.validation_failed')
  }
}
