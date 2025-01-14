import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'
import type { IpsStatus } from '@/components/standalone/security/ips/IpsSettings.vue'

export const ipsStatus = defineStore('ipsStatus', () => {
  const enabled = ref<boolean>()
  const loading = ref(true)

  function fetchStatus() {
    if (enabled.value == undefined) {
      ubusCall('ns.snort', 'status', {})
        .then((response: AxiosResponse<IpsStatus>) => {
          enabled.value = response.data.enabled
        })
        .finally(() => {
          loading.value = false
        })
    }
  }

  return {
    enabled,
    loading,
    fetchStatus
  }
})
