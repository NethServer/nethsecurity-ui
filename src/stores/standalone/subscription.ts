import { defineStore } from 'pinia'
import { onMounted, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import {
  DPI_LOADED_APPLICATIONS_KEY,
  DPI_LOADED_PROTOCOLS_KEY
} from '@/composables/useDpiCatalog.ts'
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
  const queryClient = useQueryClient()
  const loading = ref(true)
  const error = ref<Error>()
  const isActive = ref(false)

  function loadData() {
    loading.value = true
    error.value = undefined
    ubusCall('ns.subscription', 'info')
      .then((res: SubscriptionStatusResponse) => {
        const active = res.data.active ?? false

        if (active !== isActive.value) {
          queryClient.invalidateQueries({ queryKey: DPI_LOADED_APPLICATIONS_KEY })
          queryClient.invalidateQueries({ queryKey: DPI_LOADED_PROTOCOLS_KEY })
        }

        isActive.value = active
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
