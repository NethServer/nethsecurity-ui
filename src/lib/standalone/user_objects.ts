//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import {
  faDesktop,
  faNetworkWired,
  faArrowsLeftRightToLine,
  faAddressCard,
  faBoxArchive,
  faGlobe,
  faCircleQuestion
} from '@fortawesome/free-solid-svg-icons'
import { library } from '@fortawesome/fontawesome-svg-core'

library.add(faDesktop)
library.add(faNetworkWired)
library.add(faArrowsLeftRightToLine)
library.add(faAddressCard)
library.add(faBoxArchive)
library.add(faGlobe)
library.add(faCircleQuestion)

export function getHostSetIcon(subtype: string) {
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
    default:
      return faCircleQuestion
  }
}
