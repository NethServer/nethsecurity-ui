//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { upperFirst } from 'lodash-es'

export interface DpiAppOrProtocol {
  id: number
  name: string
  type: 'application' | 'protocol'
  missing?: boolean
  category?: {
    name: string
  }
}

export interface DpiRule {
  'config-name': string
  enabled: boolean
  device: string
  interface: string
  criteria: DpiAppOrProtocol[]
}

export function getHumanizedAppName(appName: string) {
  // capitalize, remove 'netify.' prefix and replace dashes with spaces
  return upperFirst(appName.replace(/-/g, ' ').replace(/netify./g, ''))
}

export function getHumanizedCategoryName(categoryName: string) {
  // capitalize and replace dashes with spaces
  return upperFirst(categoryName.replace(/-/g, ' '))
}

export function getAppIcon(app: DpiAppOrProtocol) {
  switch (app.name) {
    case 'netify.facebook':
      return ['fab', 'facebook']
    case 'netify.amazon-prime':
      return ['fab', 'amazon']
    case 'netify.whatsapp':
      return ['fab', 'whatsapp']
    case 'netify.instagram':
      return ['fab', 'instagram']
    case 'netify.netflix':
      return ['fab', 'netflix']
    case 'netify.telegram':
      return ['fab', 'telegram']
    case 'netify.tiktok':
      return ['fab', 'tiktok']
    case 'netify.youtube':
      return ['fab', 'youtube']
    case 'netify.facebook-messenger':
      return ['fab', 'facebook-messenger']
    case 'netify.twitter':
      return ['fab', 'square-x-twitter']
    case 'netify.vimeo':
      return ['fab', 'vimeo']
    case 'netify.snapchat':
      return ['fab', 'snapchat']
    case 'netify.pinterest':
      return ['fab', 'pinterest']
    case 'netify.nordvpn':
      return ['fab', 'nord-vpn']
    case 'netify.twitch':
      return ['fab', 'twitch']
    case 'netify.teamviewer':
      return ['fas', 'arrows-left-right']
    default:
      if (app.type === 'application') {
        return ['fas', 'shapes']
      } else {
        return ['fas', 'diagram-project']
      }
  }
}
