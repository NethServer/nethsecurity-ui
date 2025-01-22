import { defineStore } from 'pinia'
import { onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'

type IpsStatus = AxiosResponse<{
  status: {
    enabled: boolean
    alerts: number
    drops: number
  }
}>

export const useIpsStatusStore = defineStore('ipsStatus', () => {
  const enabled = ref<boolean>(false)
  const alerts = ref<number>(0)
  const drops = ref<number>(0)
  const loading = ref(true)
  const error = ref<Error>()

  function fetchStatus() {
    ubusCall('ns.snort', 'status', {})
      .then((response: IpsStatus) => {
        enabled.value = response.data.status.enabled
        alerts.value = response.data.status.alerts
        drops.value = response.data.status.drops
      })
      .catch((reason: Error) => {
        error.value = reason
      })
      .finally(() => {
        loading.value = false
      })
  }

  onMounted(() => {
    fetchStatus()
  })

  return {
    enabled,
    loading,
    error,
    alerts,
    drops,
    fetchStatus
  }
})
