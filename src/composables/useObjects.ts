//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import {
  faDesktop,
  faNetworkWired,
  faArrowsLeftRightToLine,
  faAddressCard,
  faBoxArchive,
  faGlobe,
  faCloud,
  faCircleQuestion
} from '@fortawesome/free-solid-svg-icons'
import { library } from '@fortawesome/fontawesome-svg-core'

export type IpVersion = 'ipv4' | 'ipv6'

export type ObjectReference = {
  id: string
  name: string
  type: string
  subtype: string
  family: IpVersion
  used: boolean
  matches: string[]
  ipaddr?: string[]
}

/**
 * Composable that handles domain sets. They are managed in Users and object > Objects > Domain sets
 * @deprecated
 * @see objects.ts
 */
export function useObjects() {
  library.add(faDesktop)
  library.add(faNetworkWired)
  library.add(faArrowsLeftRightToLine)
  library.add(faAddressCard)
  library.add(faBoxArchive)
  library.add(faGlobe)
  library.add(faCircleQuestion)
  library.add(faCloud)

  function getObjectIcon(subtype: string) {
    switch (subtype) {
      case 'host':
      case 'dns_record':
        return faDesktop
      case 'cidr':
        return faNetworkWired
      case 'range':
        return faArrowsLeftRightToLine
      case 'dhcp_static_lease':
        return faAddressCard
      case 'host_set':
        return faBoxArchive
      case 'vpn_user':
        return faGlobe
      case 'domain_set':
        return faCloud
      default:
        return faCircleQuestion
    }
  }

  return {
    getObjectIcon
  }
}
