//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isEmpty } from 'lodash-es'
import axios from 'axios'
import { deleteFromStorage, saveToStorage, getJsonFromStorage } from '@nethesis/vue-components'
import { useRoute, useRouter } from 'vue-router'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { getProductName, getStandaloneApiEndpoint, isStandaloneMode } from '@/lib/config'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useThemeStore } from '../theme'
import { ubusCall } from '@/lib/standalone/ubus'
import { useTitle } from '@vueuse/core'

export const TOKEN_REFRESH_INTERVAL = 1000 * 60 * 30 // half an hour

export const useLoginStore = defineStore('standaloneLogin', () => {
  const username = ref('')
  const token = ref('')
  const tokenRefreshedTime = ref(0)
  const isRefreshingToken = ref(false)
  const isSessionExpired = ref(false)

  const router = useRouter()
  const route = useRoute()

  const isLoggedIn = computed(() => {
    return !isEmpty(username.value)
  })

  const loadUserFromStorage = () => {
    const loginInfo = getJsonFromStorage('standaloneLoginInfo')

    if (loginInfo) {
      username.value = loginInfo.username
      token.value = loginInfo.token
      tokenRefreshedTime.value = loginInfo.tokenRefreshedTime
    }
  }

  const login = async (user: string, password: string) => {
    const res = await axios.post(`${getStandaloneApiEndpoint()}/login`, {
      username: user,
      password
    })
    const jwtToken = res.data.token
    tokenRefreshedTime.value = new Date().getTime()
    return jwtToken
  }

  const loginSuccessful = (user: string, jwtToken: string) => {
    const loginInfo = {
      username: user,
      token: jwtToken,
      tokenRefreshedTime: tokenRefreshedTime.value
    }
    saveToStorage('standaloneLoginInfo', loginInfo)

    username.value = user
    token.value = jwtToken

    const themeStore = useThemeStore()
    themeStore.loadTheme()
    loadAppData()
    isSessionExpired.value = false
    router.push(`${getStandaloneRoutePrefix()}/`)
  }

  const logout = async () => {
    await axios.post(
      `${getStandaloneApiEndpoint()}/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      }
    )
    deleteFromStorage('standaloneLoginInfo')
    username.value = ''
    token.value = ''
    tokenRefreshedTime.value = 0
    router.push(`${getStandaloneRoutePrefix()}/`)
  }

  const refreshToken = async () => {
    if (isRefreshingToken.value) {
      return
    }
    isRefreshingToken.value = true

    try {
      const res = await axios.get(`${getStandaloneApiEndpoint()}/refresh`, {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      })
      const jwtToken = res.data.token
      const refreshedTime = new Date().getTime()

      if (isStandaloneMode()) {
        const loginInfo = {
          username: username.value,
          token: jwtToken,
          tokenRefreshedTime: refreshedTime
        }
        saveToStorage('standaloneLoginInfo', loginInfo)
      } else {
        // a controller is managing this unit
        const unit = route.params.unitId as string

        const unitLoginInfo = {
          unit,
          token: jwtToken,
          tokenRefreshedTime: refreshedTime
        }

        saveToStorage(`unit-${unit}`, unitLoginInfo)
      }
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

  // load data after login or on page load (if already logged in)
  const loadAppData = () => {
    // load uci pending changes
    const uciChangesStore = useUciPendingChangesStore()
    uciChangesStore.getChanges()

    // load unit hostname
    loadHostname()
  }

  const loadHostname = async () => {
    const res = await ubusCall('system', 'board')
    const unitHostname = res.data.hostname

    if (unitHostname) {
      // set window title
      const title = useTitle()
      title.value = `${unitHostname} - ${getProductName()}`
    }
  }

  const setUsername = (user: string) => {
    username.value = user
  }

  const setToken = (tok: string) => {
    token.value = tok
  }

  const setTokenRefreshedTime = (refreshedTime: number) => {
    tokenRefreshedTime.value = refreshedTime
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
    setUsername,
    setToken,
    setTokenRefreshedTime,
    refreshToken,
    loginSuccessful,
    loadAppData
  }
})
