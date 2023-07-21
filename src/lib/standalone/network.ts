//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

export function getFirewallZone(iface: any, firewallConfig: any) {
  if (firewallConfig) {
    const zoneFound = firewallConfig.zone?.find((zone: any) =>
      zone.network.includes(iface.interface)
    )

    if (zoneFound) {
      return zoneFound
    }
  }
  //   console.log('getFirewallZone', iface.interface, 'returning UNDEFINED') ////
}
