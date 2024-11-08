//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getUciConfig } from '@/lib/standalone/ubus'
import { getAxiosErrorMessage } from '@nethesis/vue-components'

export interface UciNetworkConfig {
  device?: UciNetworkDevice[]
  interface?: UciNetworkInterface[]
}

export interface UciNetworkDevice {
  name?: string
  '.anonymous'?: boolean
  '.index'?: number
  '.name'?: string
  '.type'?: 'device'
  ports?: string[]
  type?: string
  ipv6?: string
}

export interface UciNetworkInterface {
  '.name'?: string
  '.anonymous'?: boolean
  '.index'?: number
  '.type'?: 'interface'
  device?: string
  proto?: string
  ipaddr?: string
  ip6addr?: string
  netmask?: string
  force_link?: string
  gateway?: string
  metric?: string
}

/**
 * Composable that handles UCI network configuration
 */
export function useUciNetworkConfig() {
  const { t } = useI18n()

  const networkConfig = ref<UciNetworkConfig>()
  const loadingNetworkConfig = ref(false)
  const errorNetworkConfig = ref('')
  const errorNetworkConfigDetails = ref('')

  async function getNetworkConfig() {
    loadingNetworkConfig.value = true
    errorNetworkConfig.value = ''
    errorNetworkConfigDetails.value = ''

    try {
      networkConfig.value = await getUciConfig('network')
    } catch (err: any) {
      console.error(err)
      networkConfig.value = undefined
      errorNetworkConfig.value = t(getAxiosErrorMessage(err))
      errorNetworkConfigDetails.value = err.toString()
    } finally {
      loadingNetworkConfig.value = false
    }
  }

  return {
    networkConfig,
    getNetworkConfig,
    loadingNetworkConfig,
    errorNetworkConfig,
    errorNetworkConfigDetails
  }
}
