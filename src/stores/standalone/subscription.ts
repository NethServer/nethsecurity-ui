import { defineStore } from 'pinia'
import { onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import type { AxiosResponse } from 'axios'

type SubscriptionStatusResponse = AxiosResponse<SubscriptionDataType>

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
  const isActive = ref(false)

  function loadData() {
    loading.value = true
    error.value = undefined
    ubusCall('ns.subscription', 'info')
      .then((res: SubscriptionStatusResponse) => {
        isActive.value = res.data.active ?? false
      })
      .catch((err) => {
        error.value = err
      })
      .finally(() => {
        loading.value = false
      })
  }

  onMounted(() => {
    loadData()
  })

  return {
    loading,
    loadData,
    isActive,
    error
  }
})
