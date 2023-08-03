//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

export function getInterface(device: any, networkConfig: any) {
  return networkConfig.interface.find((iface: any) => iface.device === device.name)
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
      zone.network.includes(iface['.name'])
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
  switch (zoneName) {
    case 'lan':
      return 'Green'
    case 'wan':
      return 'Red'
    case 'guests':
      return 'Blue'
    //// dmz
    default:
      return ''
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
      return ''
  }
}

export function isVlan(device: any) {
  if (device.devtype === 'vlan' || device.vid) {
    return true
  } else {
    return false
  }
}
