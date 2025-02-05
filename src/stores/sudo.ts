import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import axios from 'axios'
import { getStandaloneApiEndpoint } from '@/lib/config'
import { saveToStorage } from '@nethesis/vue-components'
import { ValidationError } from '@/lib/standalone/ubus'
import { getValidationErrorsFromAxiosError } from '@/lib/validation'

export const useSudoStore = defineStore('sudo', () => {
  const loginStore = useLoginStore()

  const askingSudo = ref(false)
  const loading = ref(false)
  const error = ref<Error>()
  const invalidText = ref<string>()

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

  function askSudoToken(password: string) {
    loading.value = true
    invalidText.value = undefined
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
          invalidText.value = errorBag.getFirstI18nKeyFor('password')
        } else {
          error.value = reason
        }
      })
      .finally(() => {
        loading.value = false
      })
  }

  const needs2fa = computed<boolean>(() => {
    const claims = JSON.parse(atob(loginStore.token.split('.')[1]))
    return claims['2fa']
  })

  return { askingSudo, askSudoToken, loading, sudoGranted, needs2fa, error, invalidText }
})

export class UnauthorizedAction extends Error {
  constructor() {
    super('error.unauthorized_action')
  }
}
