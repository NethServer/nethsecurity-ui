//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isEmpty } from 'lodash-es'
import { getJsonFromStorage, deleteFromStorage, saveToStorage } from '@nethesis/vue-components'
import axios from 'axios'
import { getControllerApiEndpoint } from '../../lib/config'
import { useRouter } from 'vue-router'
import { getControllerRoutePrefix } from '@/lib/router'
import { useThemeStore } from '../theme'

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

  const loadUserFromStorage = () => {
    const loginInfo = getJsonFromStorage('controllerLoginInfo')

    if (loginInfo) {
      username.value = loginInfo.username
      token.value = loginInfo.token
      role.value = JSON.parse(atob(loginInfo.token.split('.')[1])).role
      tokenRefreshedTime.value = loginInfo.tokenRefreshedTime
    }
  }

  const login = async (user: string, password: string) => {
    const res = await axios.post(`${getControllerApiEndpoint()}/login`, {
      username: user,
      password
    })
    const jwtToken = res.data.token
    tokenRefreshedTime.value = new Date().getTime()

    const loginInfo = {
      username: user,
      token: jwtToken,
      tokenRefreshedTime: tokenRefreshedTime.value
    }
    saveToStorage('controllerLoginInfo', loginInfo)
    username.value = user
    token.value = jwtToken
    role.value = JSON.parse(atob(jwtToken.split('.')[1])).role
    const themeStore = useThemeStore()
    themeStore.loadTheme()
    isSessionExpired.value = false
    router.push(`${getControllerRoutePrefix()}/`)
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
    isAdmin
  }
})
