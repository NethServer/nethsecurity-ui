import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
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
  const loading = ref(false)
  const invalidText = ref('')
  const error = ref<Error>()

  const sudoEnabled = computed<boolean>(() => {
    if (loginStore.token != '') {
      const payload = JSON.parse(atob(loginStore.token.split('.')[1]))
      if ('sudo' in payload) {
        const sudoDate = new Date(0)
        sudoDate.setSeconds(payload['sudo'])
        // true if sudo has been enabled in the last 5 minutes
        // Date.now needs to be divided by 1000 to get seconds
        return sudoDate.getTime() + 5 * 60 * 1000 > Date.now() / 1000
      }
      return false
    }
    return false
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
