//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'

export interface Member {
  name: string
  interface: string
  metric: number
  weight: number
  status: string
}

export interface Policy {
  name: string
  label?: string
  type: 'balance' | 'backup' | 'custom'
  members: {
    [metric: string]: Array<Member>
  }
}

export interface Rule {
  name: string
  label?: string
  policy: {
    name: string
    label?: string
  }
  protocol?: 'tcp' | 'udp' | 'icmp' | 'all'
  source_address?: string
  source_port?: string
  destination_address?: string
  destination_port?: string
  sticky: boolean
  ns_src?: string
  ns_dst?: string
}

interface ApiResponse<T> {
  values: Array<T>
}

export function useMwan() {
  const loading = ref(true)
  const error = ref<Error>()
  const policies = ref<Policy[]>([])
  const rules = ref<Rule[]>([])

  async function fetch() {
    return await Promise.all([
      ubusCall('ns.mwan', 'index_rules').then(
        (response: AxiosResponse<ApiResponse<Rule>>) => (rules.value = response.data.values)
      ),
      ubusCall('ns.mwan', 'index_policies').then(
        (response: AxiosResponse<ApiResponse<Policy>>) => (policies.value = response.data.values)
      )
    ]).catch((reason: Error) => (error.value = reason))
  }

  onMounted(() => {
    fetch().finally(() => (loading.value = false))
  })

  return { loading, fetch, policies, rules, error }
}
