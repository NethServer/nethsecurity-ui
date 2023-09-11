import { onBeforeMount, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { NeComboboxOption } from '@nethserver/vue-tailwind-lib'
import type { AxiosError, AxiosResponse } from 'axios'

/**
 * Interface describing the get firewall response
 */
interface FirewallResponse {
  values: {
    [name: string]: {
      name: string
      network: Array<string>
    }
  }
}

/**
 * Gateway form definition.
 */
export class Gateway {
  id: string
  weight: string

  constructor(id: string = '', weight: string = '100') {
    this.id = id
    this.weight = weight
  }
}

/**
 * Form used to manage Policy
 */
export interface Form {
  label?: string
  selection: PolicyOptions
  priorities: Array<Array<Gateway>>
}

/**
 * Enum categorization of possible gateways configuration
 */
export enum PolicyOptions {
  BALANCE = 'balance',
  BACKUP = 'backup',
  CUSTOM = 'custom'
}

export function usePolicyForm() {
  const form = ref<Form>({
    label: '',
    selection: PolicyOptions.BALANCE,
    priorities: [[new Gateway(), new Gateway()]]
  })
  const loading = ref(false)
  const error = ref<Error>()
  const gateways = ref<NeComboboxOption[]>()

  /**
   * Get gateways from the 'wan' firewall zone.
   */
  function fetchGateways() {
    ubusCall('uci', 'get', { config: 'firewall', type: 'zone' })
      .then(
        (response: AxiosResponse<FirewallResponse>) =>
          (gateways.value = Object.entries(response.data.values)
            .filter((value) => value[1].name == 'wan')
            .flatMap((value) => value[1].network)
            .map((value) => {
              return {
                id: value,
                label: value
              }
            }))
      )
      .catch((exception: AxiosError) => (error.value = exception))
      .finally(() => (loading.value = false))
  }

  onBeforeMount(() => {
    loading.value = true
    fetchGateways()
  })

  return { form, loading, error, gateways }
}
