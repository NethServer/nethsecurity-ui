import { defineStore } from 'pinia'
import { onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'
import type { IpsStatus } from '@/components/standalone/security/ips/IpsSettings.vue'

export const useIpsStatusStore = defineStore('ipsStatus', () => {
  const enabled = ref<boolean>()
  const loading = ref(true)

  function fetchStatus() {
    ubusCall('ns.snort', 'status', {})
      .then((response: AxiosResponse<IpsStatus>) => {
        enabled.value = response.data.enabled
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
    loading
  }
})
