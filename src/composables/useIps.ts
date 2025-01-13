import { ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'

export type Direction = 'src' | 'dst'
export type Protocol = 'ipv4' | 'ipv6'

export type ByPass = {
  direction: Direction
  protocol: Protocol
  ip: string
  description: string
}

type ByPassResponse = {
  bypasses: ByPass[]
}

export function useIps() {
  const byPasses = ref<ByPass[]>([])
  const loadingByPasses = ref(false)
  const error = ref<Error>()

  function fetchByPasses() {
    loadingByPasses.value = true
    ubusCall('ns.snort', 'list-bypasses', {})
      .then((response: AxiosResponse<ByPassResponse>) => {
        byPasses.value = response.data.bypasses
      })
      .catch((e: Error) => {
        error.value = e
      })
      .finally(() => {
        loadingByPasses.value = false
      })
  }

  return {
    byPasses,
    fetchByPasses,
    loadingByPasses,
    error
  }
}
