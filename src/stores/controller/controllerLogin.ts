//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isEmpty } from 'lodash-es'
import { getJsonFromStorage, deleteFromStorage, saveToStorage } from '@nethesis/vue-components'
import axios from 'axios'
import { getControllerApiEndpoint } from '@/lib/config'
import { useRouter } from 'vue-router'
import { getControllerRoutePrefix } from '@/lib/router'
import { useThemeStore } from '../theme'
import { jwtDecode } from 'jwt-decode'
import { verifyTwoFaOtp } from '@/lib/twoFa'

type JwtToken = {
  '2fa': boolean
}

export const TOKEN_REFRESH_INTERVAL = 1000 * 60 * 30 // half an hour

export const useLoginStore = defineStore('controllerLogin', () => {
  const username = ref('')
  const token = ref('')
  const role = ref('')
  const tokenRefreshedTime = ref(0)
  const isRefreshingToken = ref(false)
  const isSessionExpired = ref(false)

  const router = useRouter()

  const isLoggedIn = computed(() => {
    return !isEmpty(username.value)
  })
  const isAdmin = computed(() => role.value === 'admin')

  const twoFaActive = computed((): boolean => {
    try {
      return jwtDecode<JwtToken>(token.value)['2fa']
    } catch (e) {
      return false
    }
  })

  const loadUserFromStorage = () => {
    const loginInfo = getJsonFromStorage('controllerLoginInfo')

    if (loginInfo) {
      username.value = loginInfo.username
      token.value = loginInfo.token
      role.value = JSON.parse(atob(loginInfo.token.split('.')[1])).role
      tokenRefreshedTime.value = loginInfo.tokenRefreshedTime
    }
  }

  const login = async (user: string, password: string, rememberMe = false) => {
    const res = await axios.post(`${getControllerApiEndpoint()}/login`, {
      username: user,
      password
    })

    // set or remove username to/from local storage
    if (rememberMe) {
      saveToStorage('controllerUsername', username.value)
    } else {
      deleteFromStorage('controllerUsername')
    }

    token.value = res.data.token
    tokenRefreshedTime.value = new Date().getTime()
    if (!twoFaActive.value) {
      username.value = user
      role.value = JSON.parse(atob(token.value.split('.')[1])).role
      saveToStorage('controllerLoginInfo', {
        username: username.value,
        token: token.value,
        tokenRefreshedTime: tokenRefreshedTime.value
      })
    }
  }

  async function verifyTwoFaToken(user: string, otp: string) {
    await verifyTwoFaOtp(user, token.value, otp)
    username.value = user
    role.value = JSON.parse(atob(token.value.split('.')[1])).role
    saveToStorage('controllerLoginInfo', {
      username: username.value,
      token: token.value,
      tokenRefreshedTime: tokenRefreshedTime.value
    })
    const themeStore = useThemeStore()
    themeStore.loadTheme()
    isSessionExpired.value = false
  }

  const logout = async () => {
    await axios.post(
      `${getControllerApiEndpoint()}/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      }
    )
    deleteFromStorage('controllerLoginInfo')
    username.value = ''
    token.value = ''
    tokenRefreshedTime.value = 0
    router.push(`${getControllerRoutePrefix()}/`)
  }

  const refreshToken = async () => {
    if (isRefreshingToken.value) {
      return
    }
    isRefreshingToken.value = true

    try {
      const res = await axios.get(`${getControllerApiEndpoint()}/refresh`, {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      })
      const jwtToken = res.data.token
      const refreshedTime = new Date().getTime()

      const loginInfo = {
        username: username.value,
        token: jwtToken,
        tokenRefreshedTime: refreshedTime
      }
      saveToStorage('controllerLoginInfo', loginInfo)
      token.value = jwtToken
      tokenRefreshedTime.value = refreshedTime
      return jwtToken
    } catch (err) {
      console.error(err)
      return null
    } finally {
      isRefreshingToken.value = false
    }
  }

  return {
    username,
    token,
    tokenRefreshedTime,
    isLoggedIn,
    isSessionExpired,
    loadUserFromStorage,
    login,
    logout,
    refreshToken,
    isAdmin,
    twoFaActive,
    verifyTwoFaToken
  }
})
