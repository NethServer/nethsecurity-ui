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
  remote_hosts?: TrafficRecord[]
  protocols?: TrafficRecord[]
}

export function useTrafficStats() {
  const loading = ref(false)
  const error = ref<Error>()
  const data = ref<TrafficSummary>({
    total_traffic: 0,
    hourly_traffic: [],
    applications: [],
    clients: []
  })

  function loadData(client?: string, application?: string) {
    loading.value = true
    const payload: {
      client?: string
      application?: string
    } = {}
    if (client) {
      payload.client = client
    }
    if (application) {
      payload.application = application
    }
    ubusCall('ns.dpireport', 'summary-v2', payload)
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

  return {
    loading,
    error,
    data,
    loadData
  }
}
