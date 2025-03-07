import { defineStore } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import type { AxiosResponse } from 'axios'

type SubscriptionStatusResponse = AxiosResponse<SubscriptionDataType>

/*
{
    "active": true,
    "expiration": 0,
    "plan": "Nethesis Enterprise",
    "server_id": 76838,
    "systemd_id": "EAB54E5B-BD6C-4C1D-8538-3A618E5F72E4",
    "type": "enterprise"
}
{
    "systemd_id": ""
}
 */
export type SubscriptionDataType = {
  server_id?: number
  systemd_id: string
  plan?: string
  expiration?: number
  active?: boolean
}

export const useSubscriptionStore = defineStore('subscription', () => {
  const loading = ref(true)
  const error = ref<Error>()
  const data = ref<SubscriptionDataType>()

  function loadData() {
    loading.value = true
    error.value = undefined
    ubusCall('ns.subscription', 'info')
      .then((res: SubscriptionStatusResponse) => {
        data.value = res.data
      })
      .catch((err) => {
        error.value = err
      })
      .finally(() => {
        loading.value = false
      })
  }

  const isActive = computed(() => {
    return data.value?.active ?? false
  })

  onMounted(() => {
    loadData()
  })

  return {
    loading,
    loadData,
    isActive
  }
})
