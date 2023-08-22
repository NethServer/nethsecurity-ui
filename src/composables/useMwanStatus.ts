//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError, AxiosResponse } from 'axios'
import { computed, onMounted, onUnmounted, ref } from 'vue'

export interface IFace {
  status: string
}

export function useMwanStatus() {
  const data = ref()
  const error = ref<Error>()
  const loading = ref(true)

  const interfaces = computed(() => {
    const map = new Map<string, IFace>()
    Object.entries(data.value?.interfaces ?? []).forEach((entry: [string, any]) => {
      map.set(entry[0], {
        status: entry[1].status
      })
    })
    return map
  })

  function fetch() {
    ubusCall('mwan3', 'status')
      .then((response: AxiosResponse) => (data.value = response.data))
      .catch((exception: AxiosError) => (error.value = exception))
      .finally(() => (loading.value = false))
  }

  let interval: number

  onMounted(() => {
    fetch()
    interval = setInterval(() => fetch(), 5000)
  })

  onUnmounted(() => clearInterval(interval))

  return { data, error, loading, interfaces }
}
