import { defineStore } from 'pinia'
import type { AxiosResponse } from 'axios'
import { onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus.ts'

type PassPhraseData = {
  values: {
    set: boolean
  }
}

type PassPhraseResponse = AxiosResponse<PassPhraseData>

export const useBackupsStore = defineStore('backups', () => {
  const loading = ref(true)
  const isPassPhraseSet = ref(false)
  const error = ref<Error>()

  function loadData() {
    error.value = undefined
    ubusCall('ns.backup', 'is-passphrase-set')
      .then((response: PassPhraseResponse) => {
        isPassPhraseSet.value = response.data.values.set
      })
      .catch((reason) => {
        error.value = reason
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
    error,
    isPassPhraseSet
  }
})
