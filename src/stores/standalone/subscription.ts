import { defineStore } from 'pinia'
import { onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import type { AxiosResponse } from 'axios'

type SubscriptionStatusResponse = AxiosResponse<SubscriptionDataType>

export type SubscriptionDataType = {
  server_id?: number | string
  systemd_id: string
  plan?: string
  expiration?: number
  active?: boolean
  // enterprise units (migrated to the new my): type='enterprise' and the
  // organization name; community units keep the legacy plan name and no org.
  type?: string
  organization?: string
}

export const useSubscriptionStore = defineStore('subscription', () => {
  const loading = ref(true)
  const error = ref<Error>()
  const isActive = ref(false)
  const isEnterprise = ref(false)

  function loadData() {
    loading.value = true
    error.value = undefined
    ubusCall('ns.subscription', 'info')
      .then((res: SubscriptionStatusResponse) => {
        isActive.value = res.data.active ?? false
        isEnterprise.value = res.data.type === 'enterprise'
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
    isEnterprise,
    error
  }
})
