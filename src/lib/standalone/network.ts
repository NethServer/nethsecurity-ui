//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { SpecialZones, type Forwarding, type Zone } from '@/stores/standalone/firewall'
import { useI18n } from 'vue-i18n'
import { isEqual, uniqWith } from 'lodash-es'
import type { UciNetworkConfig } from '@/composables/useUciNetworkConfig'

export interface DeviceOrIface {
  name?: string
  '.name'?: string
  type?: string
  '.type'?: string
  mac?: string
  mtu?: number
  up?: boolean
  ipaddrs?: Ipv4Address[]
  ip6addrs?: Ipv6Address[]
  stats?: Stats
  ipv6?: string
  ports?: string[]
  ifname?: string
  vid?: string
  proto?: string
  bonding_policy?: string
  ipaddr?: string
  packets_per_slave?: string
  slaves?: string[]
  bond_interface?: string
  speed?: number
  zone?: string
  hotspot?: HotspotConfig
  iface?: any
  openvpn?: any
  openvpn_rw?: any
  ns_link?: string
}

export interface ZoneWithDevices {
  name: string
  devices: DeviceOrIface[]
}

export interface ZoneWithDeviceNames {
  name: string
  devices: string[]
}

export interface DeviceVpnNetworks {
  openvpn: Record<string, string[]>
  openvpnRw: Record<string, string>
  ipsec: Record<string, string[]>
}

interface Ipv4Address {
  address: string
  netmask: string
  broadcast: string
}

interface Ipv6Address {
  address: string
  netmask: string
}

interface Stats {
  collisions: number
  multicast: number
  rx_bytes: number
  rx_dropped: number
  rx_errors: number
  rx_packets: number
  tx_bytes: number
  tx_dropped: number
  tx_errors: number
  tx_packets: number
}

interface HotspotConfig {
  hotspot_id: string
  unit_name: string
  unit_description: string
  network: string
  interface: string // it's actually a device name
}

export function getInterface(deviceOrIface: DeviceOrIface) {
  // if deviceOrIface is an interface, just return it as it is
  if (deviceOrIface['.type'] === 'interface') {
    return deviceOrIface
  }

  return deviceOrIface.iface
}

export function getInterfaceDisplayName(deviceOrIface: DeviceOrIface) {
  if (isOpenVpnRw(deviceOrIface)) {
    return deviceOrIface.openvpn_rw.ns_description
  } else {
    if (getInterface(deviceOrIface)) {
      return getInterface(deviceOrIface)['.name']
    } else {
      return ''
    }
  }
}

export function getAliasInterface(device: DeviceOrIface, networkConfig: UciNetworkConfig) {
  if (!networkConfig) {
    return
  }

  const iface = getInterface(device)

  if (!iface) {
    return
  }

  return networkConfig.interface?.find(
    (ifaceElem: any) => ifaceElem.device === `@${iface['.name']}`
  )
}

export function getFirewallZone(iface: any, firewallConfig: any) {
  if (firewallConfig) {
    const zoneFound = firewallConfig.zone?.find((zone: any) =>
      zone.network?.includes(iface['.name'])
    )

    if (zoneFound) {
      return zoneFound
    }
  }
}

export function getUiZoneName(deviceOrIface: DeviceOrIface, devicesByZone: ZoneWithDeviceNames[]) {
  for (const zone of devicesByZone) {
    for (const zoneDev of zone.devices) {
      if (zoneDev === getName(deviceOrIface)) {
        return zone.name
      }
    }
  }
}

export function getZoneColor(zoneName: string) {
  const { t } = useI18n()

  switch (zoneName) {
    case 'lan':
      return 'Green'
    case 'wan':
      return 'Red'
    case 'guest':
      return 'Blue'
    case 'dmz':
      return 'Orange'
    case 'hotspot':
    case 'vpn':
    case 'unknown':
    case 'unassigned':
      return ''
    default:
      // custom zone
      return t('standalone.interfaces_and_devices.custom_zone')
  }
}

export function getZoneColorClasses(zoneName: string) {
  switch (zoneName) {
    case 'wan':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-700 dark:text-rose-50'
    case 'lan':
      return 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-50'
    case 'guest':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-50'
    case 'dmz':
    case 'unknown':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-700 dark:text-amber-50'
    case 'hotspot':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-50'
    case 'rwopenvpn':
    case 'openvpn':
    case 'ipsec':
    case 'vpn':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-700 dark:text-teal-50'
    case 'unassigned':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-50'
    default:
      return 'bg-violet-100 text-violet-700 dark:bg-violet-700 dark:text-violet-50'
  }
}

export function getZoneBorderColorClasses(zoneName: string) {
  switch (zoneName) {
    case 'lan':
      return 'border-green-700 dark:border-green-700'
    case 'wan':
      return 'border-rose-700 dark:border-rose-700'
    case 'guest':
      return 'border-blue-700 dark:border-blue-700'
    case 'dmz':
    case 'unknown':
      return 'border-amber-700 dark:border-amber-700'
    case 'hotspot':
      return 'border-sky-700 dark:border-sky-700'
    case 'vpn':
      return 'border-teal-700 dark:border-teal-700'
    case 'unassigned':
      return 'border-gray-500 dark:border-gray-500'
    default:
      // custom zone
      return 'border-violet-700 dark:border-violet-700'
  }
}

export function getZoneIcon(zoneName: string) {
  switch (zoneName) {
    case 'lan':
      return 'location-dot'
    case 'wan':
      return 'earth-americas'
    case 'guest':
      return 'users'
    case 'dmz':
      return 'shield'
    case 'hotspot':
      return 'wifi'
    case 'rwopenvpn':
    case 'openvpn':
    case 'ipsec':
    case 'vpn':
      return 'globe'
    case 'unassigned':
      return 'unlock'
    case 'unknown':
      return 'warning'
    default:
      return 'star'
  }
}

export function getZoneIconBackgroundStyle(zoneName: string | undefined) {
  if (!zoneName) {
    return 'bg-gray-100 dark:bg-gray-500'
  }

  switch (zoneName) {
    case 'lan':
      return 'bg-green-100 dark:bg-green-700'
    case 'wan':
      return 'bg-rose-100 dark:bg-rose-700'
    case 'guest':
      return 'bg-blue-100 dark:bg-blue-700'
    case 'dmz':
    case 'unknown':
      return 'bg-amber-100 dark:bg-amber-700'
    case 'hotspot':
      return 'bg-sky-100 dark:bg-sky-700'
    case 'vpn':
      return 'bg-teal-100 dark:bg-teal-700'
    case 'unassigned':
      return 'bg-gray-100 dark:bg-gray-500'
    default:
      return 'bg-violet-100 dark:bg-violet-700'
  }
}

export function getZoneIconForegroundStyle(zoneName: string | undefined) {
  if (!zoneName) {
    return 'text-gray-500 dark:text-gray-50'
  }

  switch (zoneName) {
    case 'lan':
      return 'text-green-700 dark:text-green-50'
    case 'wan':
      return 'text-rose-700 dark:text-rose-50'
    case 'guest':
      return 'text-blue-700 dark:text-blue-50'
    case 'dmz':
      return 'text-amber-700 dark:text-amber-50'
    case 'hotspot':
      return 'text-sky-700 dark:text-sky-50'
    case 'vpn':
      return 'text-teal-700 dark:text-teal-50'
    default:
      return 'text-violet-700 dark:text-violet-50'
  }
}

export function isVlan(device: DeviceOrIface) {
  if (device.vid) {
    return true
  } else {
    return false
  }
}

export function isBridge(device: DeviceOrIface) {
  if (device?.type === 'bridge') {
    return true
  } else {
    return false
  }
}

export function isBond(deviceOrIface: DeviceOrIface) {
  return (
    deviceOrIface?.proto === 'bonding' ||
    (deviceOrIface.name?.startsWith('bond-') && !isVlan(deviceOrIface))
  )
}

export function isUnconfiguredBond(deviceOrIface: DeviceOrIface) {
  return isBond(deviceOrIface) && !deviceOrIface.iface
}

export function isConfiguredBond(deviceOrIface: DeviceOrIface) {
  return isBond(deviceOrIface) && deviceOrIface.iface
}

export function isIpsec(device: DeviceOrIface) {
  return device.zone === 'ipsec'
}

export function isOpenVpnTunnel(device: DeviceOrIface) {
  return device.openvpn
}

export function isOpenVpnRw(device: DeviceOrIface) {
  return device.openvpn_rw
}

export function isVpn(device: DeviceOrIface) {
  return isOpenVpnTunnel(device) || isOpenVpnRw(device) || isIpsec(device)
}

export function isHotspot(device: DeviceOrIface) {
  return device.hotspot
}

export function generateDeviceName(devicePrefix: string, networkConfig: UciNetworkConfig) {
  let num = -1
  let nameAlreadyExists = true
  let deviceNameGenerated = ''

  do {
    num++
    deviceNameGenerated = `${devicePrefix}${num}`
    nameAlreadyExists =
      networkConfig.device?.some((dev: any) => dev.name === deviceNameGenerated) || false
  } while (nameAlreadyExists)

  return deviceNameGenerated
}

export function getName(deviceOrIface: DeviceOrIface) {
  if (deviceOrIface['.type'] === 'interface') {
    return deviceOrIface['.name'] || '-'
  } else {
    return deviceOrIface.name || '-'
  }
}

// if traffic from input zone to WAN is allowed return the specific forwarding, return undefined otherwise
export function getTrafficToWan(zone: Zone, forwardings: Forwarding[]) {
  if (zone.name != SpecialZones.WAN) {
    return forwardings
      .filter((forwarding: Forwarding) => forwarding.source == zone.name)
      .map((forwarding: Forwarding) => forwarding.destination)
      .some((forwardingName) => forwardingName == SpecialZones.WAN)
  }
  return undefined
}

// return the forwardings that have input zone as source and don't have WAN as destination
export function forwardingsToByZone(zone: Zone, forwardings: Forwarding[]): Array<Forwarding> {
  return forwardings.filter(
    (forwarding: Forwarding) =>
      forwarding.source == zone.name && forwarding.destination != SpecialZones.WAN
  )
}

// return the forwardings that have input zone as destination
export function forwardingsFromByZone(zone: Zone, forwardings: Forwarding[]): Array<Forwarding> {
  return forwardings.filter((forwarding: Forwarding) => forwarding.destination == zone.name)
}

export function getIpv4Addresses(
  device: DeviceOrIface,
  networkConfig: UciNetworkConfig | undefined
) {
  if (!networkConfig) {
    return []
  }

  const ipv4Addresses = []
  const iface = getInterface(device)
  const aliasIface = getAliasInterface(device, networkConfig)

  // device ip addresses

  if (device.ipaddrs && device.ipaddrs.length > 0) {
    for (const ipv4 of device.ipaddrs) {
      // skip alias addresses
      if (!aliasIface || !aliasIface.ipaddr || !aliasIface.ipaddr.includes(ipv4.address)) {
        ipv4Addresses.push(ipv4.address)
      }
    }
  }

  // interface ip address

  if (iface?.ipaddr) {
    // skip alias addresses
    if (!aliasIface || !aliasIface.ipaddr || !aliasIface.ipaddr.includes(iface.ipaddr)) {
      ipv4Addresses.push(iface.ipaddr)
    }
  }
  if (isBond(device) && ipv4Addresses.length > 0) {
    ipv4Addresses.splice(0, 1)
  }
  return uniqWith(ipv4Addresses, isEqual)
}

export function getIpv6Addresses(
  device: DeviceOrIface,
  networkConfig: UciNetworkConfig | undefined
) {
  if (!networkConfig) {
    return []
  }

  // ensure ipv6 is enabled
  if (device.ipv6 !== '1') {
    return []
  }

  const ipv6Addresses = []
  const iface = getInterface(device)
  const aliasIface = getAliasInterface(device, networkConfig)

  // device ip addresses

  if (device.ip6addrs && device.ip6addrs.length > 0) {
    for (const ipv6 of device.ip6addrs) {
      // skip alias addresses
      if (!aliasIface || !aliasIface.ip6addr || !aliasIface.ip6addr.includes(ipv6.address)) {
        ipv6Addresses.push(ipv6.address)
      }
    }
  }

  // interface ip address

  if (iface?.ip6addr) {
    let addr = iface.ip6addr

    // ipv6 address is stored inside a one-element array
    if (addr instanceof Array) {
      addr = addr[0]
    }

    // skip alias addresses
    if (!aliasIface || !aliasIface.ip6addr || !aliasIface.ip6addr.includes(addr)) {
      ipv6Addresses.push(addr)
    }
  }
  return uniqWith(ipv6Addresses, isEqual)
}

export function isDeviceUp(device: DeviceOrIface, allDevices: DeviceOrIface[]) {
  // get parent device if it's a vlan
  if (isVlan(device)) {
    const vlanParent = getVlanParent(device, allDevices)
    return vlanParent?.up
  }
  return device?.up
}

export function getVlanParent(bridgeDevice: DeviceOrIface, allDevices: DeviceOrIface[]) {
  const parentDevice = bridgeDevice.ifname
  const deviceFound = allDevices.find((dev) => dev.name === parentDevice)
  return deviceFound
}

export function isIpv6Enabled(device: DeviceOrIface) {
  const iface = getInterface(device)
  return device.ipv6 === '1' || (iface.proto === 'pppoe' && device.ipv6 === 'auto')
}
