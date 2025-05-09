import { defineStore } from 'pinia'
import { onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'

type HaStatus = AxiosResponse<{
  state: string
  role: string
  status: string
  last_sync_status: string
  last_sync_time: number
}>

export const useHaStatusStore = defineStore('haStatus', () => {
  const state = ref<string>('')
  const role = ref<string>('')
  const status = ref<string>('')
  const lastSyncStatus = ref<string>('')
  const lastSyncTime = ref<number>(0)

  const loading = ref(true)
  const error = ref<Error>()

  function fetchStatus() {
    ubusCall('ns.ha', 'status', {})
      .then((response: HaStatus) => {
        state.value = response.data.state
        role.value = response.data.role
        status.value = response.data.status
        lastSyncStatus.value = response.data.last_sync_status.toLowerCase().replace(/ /g, '_')
        lastSyncTime.value = response.data.last_sync_time
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
    state,
    role,
    status,
    lastSyncStatus,
    lastSyncTime,
    loading,
    error,
    fetchStatus
  }
})
