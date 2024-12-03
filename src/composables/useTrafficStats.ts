import { ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'

export type TrafficRecord = {
  id: string
  label?: string
  traffic: number
}

export type TrafficSummary = {
  total_traffic: number
  hourly_traffic: TrafficRecord[]
  applications: TrafficRecord[]
  clients: TrafficRecord[]
  remote_hosts: TrafficRecord[]
  protocols: TrafficRecord[]
}

export function useTrafficStats() {
  const loading = ref(true)
  const error = ref<Error>()
  const data = ref<TrafficSummary>()

  function loadData() {
    ubusCall('ns.dpireport', 'summary-v2')
      .then((response: AxiosResponse<TrafficSummary>) => {
        data.value = response.data
      })
      .catch((reason: Error) => {
        error.value = reason
      })
      .finally(() => {
        loading.value = false
      })
  }

  loadData()

  return {
    loading,
    error,
    data,
    loadData
  }
}
