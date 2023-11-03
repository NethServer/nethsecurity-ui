//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { SpecialZones, type Forwarding, type Zone } from '@/stores/standalone/useFirewallStore'
import { useI18n } from 'vue-i18n'

export function getInterface(deviceOrIface: any, networkConfig: any) {
  // if deviceOrIface is an interface, just return it as it is
  if (deviceOrIface['.type'] === 'interface') {
    return deviceOrIface
  }

  return networkConfig.interface?.find((iface: any) => iface.device === deviceOrIface.name)
}

export function getAliasInterface(device: any, networkConfig: any) {
  const iface = getInterface(device, networkConfig)

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

export function getZoneLabel(zoneName: string) {
  switch (zoneName) {
    case 'lan':
      return 'LAN'
    case 'wan':
      return 'WAN'
    case 'guests':
      return 'Guests'
    case 'openvpnrw':
      return 'OpenVPN RW'
    //// dmz
    default:
      return zoneName
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
    //// dmz
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
    default:
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:text-indigo-50'
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
    case 'openvpnrw':
      return 'border-teal-700 dark:border-teal-700'
    default:
      // custom zone
      return 'border-indigo-700 dark:border-indigo-700'
  }
}

export function getZoneIcon(zoneName: string) {
  switch (zoneName) {
    case 'lan':
      return 'location-dot'
    case 'wan':
      return 'earth-americas'
    case 'guests':
      return 'user-group'
    //// dmz
    default:
      return 'star'
  }
}

export function isVlan(device: any) {
  if (device.devtype === 'vlan' || device.vid) {
    return true
  } else {
    return false
  }
}

export function isBridge(device: any) {
  if (device.devtype === 'bridge' || device.type === 'bridge') {
    return true
  } else {
    return false
  }
}

export function isBond(iface: any) {
  return iface.proto === 'bonding'
}

export function isBondDevice(device: any) {
  return device.devtype === 'bond'
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

export function getName(deviceOrIface: any) {
  if (deviceOrIface['.type'] === 'interface') {
    return deviceOrIface['.name']
  } else {
    return deviceOrIface.name
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
