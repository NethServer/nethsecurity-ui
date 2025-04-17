import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { useLoginStore } from '@/stores/standalone/standaloneLogin.ts'
import axios from 'axios'
import { getStandaloneApiEndpoint } from '@/lib/config.ts'
import { saveToStorage } from '@nethesis/vue-components'
import { getValidationErrorsFromAxiosError } from '@/lib/validation.ts'

export class UnauthorizedAction extends Error {
  constructor() {
    super('error.unauthorized_action')
  }
}

export const useSudoStore = defineStore('sudo', () => {
  const loginStore = useLoginStore()

  const askingSudo = ref(false)
  const sudoEnabled = ref(false)
  const loading = ref(false)
  const invalidText = ref('')
  const error = ref<Error>()

  watchEffect(() => {
    // This is a workaround to make sure that we notify the axios interceptor to retry the request
    // when the sudo token is received
    if (sudoEnabled.value) {
      setTimeout(() => {
        sudoEnabled.value = false
      }, 5000)
    }
  })

  function askSudoToken(password: string) {
    loading.value = true
    invalidText.value = ''
    error.value = undefined
    axios
      .post<{
        data: {
          token: string
        }
      }>(
        `${getStandaloneApiEndpoint()}/sudo`,
        {
          password: password
        },
        {
          headers: {
            Authorization: `Bearer ${loginStore.token}`
          }
        }
      )
      .then((res) => {
        // TODO: tidy up this code with loginStore
        loginStore.token = res.data.data.token
        loginStore.tokenRefreshedTime = new Date().getTime()
        saveToStorage('standaloneLoginInfo', {
          username: loginStore.username,
          token: loginStore.token,
          tokenRefreshedTime: loginStore.tokenRefreshedTime
        })
        askingSudo.value = false
        sudoEnabled.value = true
      })
      .catch((reason) => {
        const errorBag = getValidationErrorsFromAxiosError(reason)
        if (errorBag.size) {
          if (errorBag.has('two_fa')) {
            invalidText.value = errorBag.getFirstI18nKeyFor('two_fa')
          } else {
            invalidText.value = errorBag.getFirstI18nKeyFor('password')
          }
        } else {
          error.value = reason
        }
      })
      .finally(() => {
        loading.value = false
      })
  }

  return {
    askSudoToken,
    askingSudo,
    sudoEnabled,
    loading,
    error,
    invalidText
  }
})
