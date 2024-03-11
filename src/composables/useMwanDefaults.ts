//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'
import { AxiosError } from 'axios'
import { onMounted, ref } from 'vue'

export interface DefaultsMwanResponse {
  values: {
    initial_state: string
    protocol: string
    track_ip: string[]
    tracking_method: string
    tracking_reliability: number
    ping_count: number
    ping_size: number
    ping_max_ttl: number
    ping_timeout: number
    ping_interval: number
    ping_failure_interval: number
    ping_recovery_interval: number
    interface_down_threshold: number
    interface_up_threshold: number
    link_quality: boolean
    quality_failure_latency: number
    quality_failure_packet_loss: number
    quality_recovery_latency: number
    quality_recovery_packet_loss: number
  }
}

export function useMwanDefaults() {
  const data = ref<DefaultsMwanResponse>()
  const loading = ref(false)
  const error = ref<Error>()

  const fetch = function () {
    loading.value = true
    ubusCall('uci', 'get', {
      config: 'ns-api',
      section: 'defaults_mwan'
    })
      .then((response: AxiosResponse<DefaultsMwanResponse>) => {
        data.value = response.data
      })
      .catch((networkError: AxiosError) => {
        error.value = networkError
      })
      .finally(() => {
        loading.value = false
      })
  }

  onMounted(() => fetch())

  return { data, loading, error, fetch }
}
