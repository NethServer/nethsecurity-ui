import { defineStore } from 'pinia'
import { onMounted, ref, watch } from 'vue'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import axios from 'axios'
import { getStandaloneApiEndpoint } from '@/lib/config'
import { saveToStorage } from '@nethesis/vue-components'
import { getValidationErrorsFromAxiosError } from '@/lib/validation'
import { getTwoFaStatus } from '@/lib/twoFa'

type AskSudoData = {
  password?: string
  two_fa?: string
}

export const useSudoStore = defineStore('sudo', () => {
  const loginStore = useLoginStore()

  const askingSudo = ref(false)
  const loading = ref(false)
  const error = ref<Error>()
  const invalidText = ref<string>()

  const needs2fa = ref(false)
  onMounted(() => {
    // This setTimeout is cause the token from the login store is not yet set, no clue why.
    // FIXME: remove this, try to get this info from token.
    setTimeout(() => {
      getTwoFaStatus().then((response) => {
        needs2fa.value = response.data.enabled
      })
    }, 500)
  })

  /**
   * This variable is due to allow the axios interceptor to know if the sudo token has been granted
   * or the authentication has been aborted. It is used to avoid the interceptor to retry the
   * request and return an error.
   */
  const sudoGranted = ref(false)
  watch(sudoGranted, (value) => {
    if (value) {
      setTimeout(() => {
        sudoGranted.value = false
      }, 10000)
    }
  })

  function askSudoToken(data: AskSudoData) {
    loading.value = true
    invalidText.value = undefined
    error.value = undefined
    axios
      .post<{
        data: {
          token: string
        }
      }>(`${getStandaloneApiEndpoint()}/sudo`, data, {
        headers: {
          Authorization: `Bearer ${loginStore.token}`
        }
      })
      .then((res) => {
        loginStore.token = res.data.data.token
        loginStore.tokenRefreshedTime = new Date().getTime()
        saveToStorage('standaloneLoginInfo', {
          username: loginStore.username,
          token: loginStore.token,
          tokenRefreshedTime: loginStore.tokenRefreshedTime
        })
        askingSudo.value = false
        sudoGranted.value = true
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

  function askTwoFaSudoToken(code: string) {
    askSudoToken({
      two_fa: code
    })
  }

  function askPasswordSudoToken(password: string) {
    askSudoToken({
      password: password
    })
  }

  return {
    askingSudo,
    askPasswordSudoToken,
    askTwoFaSudoToken,
    loading,
    sudoGranted,
    needs2fa,
    error,
    invalidText
  }
})

export class UnauthorizedAction extends Error {
  constructor() {
    super('error.unauthorized_action')
  }
}
