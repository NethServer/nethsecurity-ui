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

interface ApiResponse {
  values: Array<Policy>
}

export function useMwan() {
  const loading = ref(true)
  const policies = ref<Policy[]>([])
  const error = ref<Error>()

  async function fetch() {
    return await ubusCall('ns.mwan', 'index_policies')
      .then((response: AxiosResponse<ApiResponse>) => (policies.value = response.data.values))
      .catch((reason: Error) => (error.value = reason))
  }

  onMounted(() => {
    fetch().finally(() => (loading.value = false))
  })

  return { loading, fetch, policies, error }
}
