//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError, AxiosResponse } from 'axios'
import { computed, onMounted, ref } from 'vue'

interface IFace {
  name: string
}

export interface Member {
  name: string
  weight: number
  metric: number
  interface: IFace
}

export interface Policy {
  name: string
  members: Array<Member>
}

interface Rule {
  name: string
  policy: Policy
}

export function useMwanConfig() {
  const data = ref()
  const error = ref<Error>()
  const loading = ref(false)

  const interfaces = computed<Array<IFace>>(() => {
    return Object.values<any>(data.value?.values ?? [])
      .filter((value) => value['.type'] == 'interface')
      .map((value) => {
        return {
          name: value['.name']
        }
      })
  })

  const members = computed<Array<Member>>(() => {
    return Object.values<any>(data.value?.values ?? [])
      .filter((value) => value['.type'] == 'member')
      .map((value) => {
        return {
          name: value['.name'],
          weight: Number(value.weight),
          metric: Number(value.metric),
          interface: interfaces.value.filter((iface) => iface.name == value.interface)[0]
        }
      })
  })

  const policies = computed<Array<Policy>>(() => {
    return Object.values<any>(data.value?.values ?? [])
      .filter((value) => value['.type'] == 'policy')
      .map((value) => {
        return {
          name: value['.name'],
          members: members.value.filter((member) => value.use_member.includes(member.name))
        }
      })
  })

  const rules = computed<Array<Rule>>(() => {
    return Object.values<any>(data.value?.values ?? [])
      .filter((value) => value['.type'] == 'rule')
      .map((value) => {
        return {
          name: value['.name'],
          policy: policies.value.filter((policy) => policy.name == value.interface)[0]
        }
      })
  })

  const fetch = function fetch() {
    loading.value = true
    ubusCall('uci', 'get', {
      config: 'mwan3'
    })
      .then((response: AxiosResponse) => (data.value = response.data))
      .catch((exception: AxiosError) => (error.value = exception))
      .finally(() => (loading.value = false))
  }

  onMounted(() => fetch())

  return { data, error, loading, interfaces, members, policies, rules }
}
