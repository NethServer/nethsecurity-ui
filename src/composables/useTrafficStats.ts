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
  applications?: TrafficRecord[]
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
    clients: []
  })

  function loadData(client?: string, application?: string, protocol?: string, host?: string) {
    loading.value = true
    const payload: {
      client?: string
      section?: string
      value?: string
    } = {}
    if (client) {
      payload.client = client
    }
    if (application) {
      payload.section = 'application'
      payload.value = application
    }
    if (protocol) {
      payload.section = 'protocol'
      payload.value = protocol
    }
    if (host) {
      payload.section = 'host'
      payload.value = host
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
