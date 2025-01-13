import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { onMounted, ref } from 'vue'
import type { AxiosResponse } from 'axios'
import { defineStore } from 'pinia'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

type IpsStatus = {
  enabled: boolean
  ns_policy: Policy
  oinkcode: string
}

export type Policy = 'connectivity' | 'balanced' | 'security' | 'max-detect'

export const useIpsStore = defineStore('ips', () => {
  const uciChangesStore = useUciPendingChangesStore()

  const loading = ref(true)
  const error = ref<Error>()
  const enabled = ref(false)
  const policy = ref<Policy>('connectivity')
  const oinkcode = ref('')

  function fetch() {
    error.value = undefined
    ubusCall('ns.snort', 'status', {})
      .then((response: AxiosResponse<IpsStatus>) => {
        enabled.value = response.data.enabled
        policy.value = response.data.ns_policy
        oinkcode.value = response.data.oinkcode
      })
      .catch((reason: Error) => {
        error.value = reason
      })
      .finally(() => {
        loading.value = false
      })
  }

  onMounted(() => {
    fetch()
  })

  const saving = ref(false)
  const saveError = ref<Error>()

  function save() {
    saving.value = true
    saveError.value = undefined
    ubusCall('ns.snort', 'save', {
      enabled: enabled.value,
      ns_policy: policy.value,
      oinkcode: oinkcode.value
    })
      .then(() => {
        uciChangesStore.getChanges()
      })
      .catch((reason: Error) => {
        saveError.value = reason
      })
      .finally(() => {
        saving.value = false
      })
  }

  const checkingOinkcode = ref(false)
  /*
  these variables are decoupled only for the sake of the UI and the different messages that
  needs to be shown to the user
   */
  const validOinkcode = ref(false)
  const invalidOinkcode = ref(false)

  function checkOinkcode() {
    checkingOinkcode.value = true
    error.value = undefined
    validOinkcode.value = false
    invalidOinkcode.value = false
    ubusCall('ns.snort', 'check-oinkcode', {
      oinkcode: oinkcode.value
    })
      .then(() => {
        validOinkcode.value = true
        setTimeout(() => {
          validOinkcode.value = false
        }, 5000)
      })
      .catch((reason: Error) => {
        if (reason instanceof ValidationError) {
          invalidOinkcode.value = true
        } else {
          error.value = reason
        }
      })
      .finally(() => {
        checkingOinkcode.value = false
      })
  }

  return {
    loading,
    error,
    enabled,
    policy,
    oinkcode,
    fetch,
    saving,
    saveError,
    save,
    checkingOinkcode,
    validOinkcode,
    invalidOinkcode,
    checkOinkcode
  }
})
