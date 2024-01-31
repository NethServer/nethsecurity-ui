//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isEmpty } from 'lodash-es'
import axios from 'axios'
import { deleteFromStorage, saveToStorage, getJsonFromStorage } from '@nethserver/vue-tailwind-lib'
import { useRouter } from 'vue-router'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { getStandaloneApiEndpoint } from '@/lib/config'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useThemeStore } from '../theme'

export const useLoginStore = defineStore('standaloneLogin', () => {
  const username = ref('')
  const token = ref('')
  const tokenRefreshedTime = ref(0)
  const isRefreshingToken = ref(false)
  const TOKEN_REFRESH_INTERVAL = 1000 * 60 * 30 // half an hour

  const router = useRouter()

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

    const uciChangesStore = useUciPendingChangesStore()
    uciChangesStore.getChanges()
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

      const loginInfo = {
        username: username.value,
        token: jwtToken,
        tokenRefreshedTime: refreshedTime
      }
      saveToStorage('standaloneLoginInfo', loginInfo)
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

  const setUsername = (user: string) => {
    username.value = user
  }

  const setToken = (tok: string) => {
    token.value = tok
  }

  return {
    username,
    token,
    tokenRefreshedTime,
    TOKEN_REFRESH_INTERVAL,
    isLoggedIn,
    loadUserFromStorage,
    login,
    logout,
    setUsername,
    setToken,
    refreshToken,
    loginSuccessful
  }
})
