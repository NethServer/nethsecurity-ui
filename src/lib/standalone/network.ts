//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { SpecialZones, type Forwarding, type Zone } from '@/stores/standalone/firewall'
import { useI18n } from 'vue-i18n'

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
  speed?: number
  zone?: string
  hotspot?: HotspotConfig
  iface?: any
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

//// remove networkConfig param?
export function getInterface(deviceOrIface: DeviceOrIface) {
  // if deviceOrIface is an interface, just return it as it is
  if (deviceOrIface['.type'] === 'interface') {
    return deviceOrIface
  }

  return deviceOrIface.iface
}

export function getAliasInterface(device: DeviceOrIface, networkConfig: any) {
  const iface = getInterface(device)

  if (!iface) {
    return
  }

  return networkConfig.interface.find((ifaceElem: any) => ifaceElem.device === `@${iface['.name']}`)
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

export function getZoneColor(zoneName: string) {
  const { t } = useI18n()

  switch (zoneName) {
    case 'lan':
      return 'Green'
    case 'wan':
      return 'Red'
    case 'guests':
      return 'Blue'
    case 'dmz':
      return 'Orange'
    case 'hotspot':
    case 'openvpn':
    case 'ipsec':
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
    case 'guests':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-50'
    case 'dmz':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-700 dark:text-amber-50'
    case 'hotspot':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-50'
    case 'openvpn':
    case 'ipsec':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-700 dark:text-teal-50'
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
    case 'guests':
      return 'border-blue-700 dark:border-blue-700'
    case 'dmz':
      return 'border-amber-700 dark:border-amber-700'
    case 'hotspot':
      return 'border-sky-700 dark:border-sky-700'
    case 'openvpn':
    case 'ipsec':
      return 'border-teal-700 dark:border-teal-700'
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
    case 'guests':
      return 'users'
    case 'dmz':
      return 'shield'
    case 'hotspot':
      return 'wifi'
    case 'openvpn':
    case 'ipsec':
      return 'globe'
    default:
      return 'star'
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

export function isBond(iface: DeviceOrIface) {
  return iface?.proto === 'bonding'
}

export function isIpsec(device: DeviceOrIface) {
  return device.zone === 'ipsec'
}

export function isHotspot(device: DeviceOrIface) {
  return device.hotspot
}

export function generateDeviceName(devicePrefix: string, networkConfig: any) {
  let num = -1
  let nameAlreadyExists = true
  let deviceNameGenerated = ''

  do {
    num++
    deviceNameGenerated = `${devicePrefix}${num}`
    nameAlreadyExists = networkConfig.device?.find((dev: any) => dev.name === deviceNameGenerated)
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
