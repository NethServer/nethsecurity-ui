//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isEmpty } from 'lodash-es'
import axios from 'axios'
import { deleteFromStorage, saveToStorage, getJsonFromStorage } from '@nethesis/vue-components'
import { useRoute, useRouter } from 'vue-router'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { getProductName, getStandaloneApiEndpoint, isStandaloneBuild } from '@/lib/config'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useThemeStore } from '../theme'
import { ubusCall } from '@/lib/standalone/ubus'
import { useTitle } from '@vueuse/core'
import { useSetupWizardStore } from './setupWizard'
import { getSessionStorageKey } from '@/lib/storage'
import { jwtDecode } from 'jwt-decode'

export const TOKEN_REFRESH_INTERVAL = 1000 * 60 * 30 // half an hour

export const useLoginStore = defineStore('standaloneLogin', () => {
  const username = ref('')
  const token = ref('')
  const tokenRefreshedTime = ref(0)
  const isRefreshingToken = ref(false)
  const isSessionExpired = ref(false)

  const router = useRouter()
  const route = useRoute()
  const wizardStore = useSetupWizardStore()

  const isLoggedIn = computed(() => {
    return !isEmpty(username.value)
  })

  /**
   * localStorage key holding this session. Covers all three deployments: the unit serving its own
   * UI, the unit proxied by a controller under /<uuid>/, and the controller bundle rendering the
   * legacy embedded route (where the unit id is a route param, not a path prefix).
   */
  const sessionStorageKey = () =>
    getSessionStorageKey(isStandaloneBuild() ? undefined : (route.params.unitId as string))

  const saveSession = (user: string, jwtToken: string, refreshedTime: number) => {
    saveToStorage(sessionStorageKey(), {
      username: user,
      token: jwtToken,
      tokenRefreshedTime: refreshedTime
    })
  }

  const loadUserFromStorage = () => {
    const key = sessionStorageKey()
    const loginInfo = getJsonFromStorage(key)

    if (!loginInfo?.token) {
      return
    }

    // A session handed over by a controller was minted by retrieveAndSaveUnitToken(), which does
    // not know the unit's username, so recover it from the token itself.
    let claims: { id?: string; exp?: number }
    try {
      claims = jwtDecode(loginInfo.token)
    } catch (err) {
      console.warn('[login]', 'discarding an unreadable stored session', err)
      deleteFromStorage(key)
      return
    }

    if (claims.exp && claims.exp * 1000 <= Date.now()) {
      // Discard rather than load: an expired token would 401 on the first call, and in proxied
      // mode there is no way to re-mint it from here.
      deleteFromStorage(key)
      return
    }

    username.value = loginInfo.username ?? claims.id ?? ''
    token.value = loginInfo.token
    tokenRefreshedTime.value = loginInfo.tokenRefreshedTime ?? 0
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

  const loginSuccessful = async (user: string, jwtToken: string) => {
    saveSession(user, jwtToken, tokenRefreshedTime.value)

    username.value = user
    token.value = jwtToken

    const themeStore = useThemeStore()
    themeStore.loadTheme()
    isSessionExpired.value = false
    loadAppData(true)
  }

  const logout = async () => {
    try {
      await axios.post(
        `${getStandaloneApiEndpoint()}/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token.value}`
          }
        }
      )
    } catch (err) {
      // The token is often already dead by the time we get here (expired session, unit rebooted).
      // Clearing local state is what actually matters, so never let this reject.
      console.warn('[login]', 'logout request failed, clearing the local session anyway', err)
    }
    deleteFromStorage(sessionStorageKey())
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

      // One write for all three deployments: sessionStorageKey() resolves to standaloneLoginInfo
      // at the root and to unit-<uuid> when a controller is involved.
      saveSession(username.value, jwtToken, refreshedTime)
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
  const loadAppData = async (justLoggedIn: boolean) => {
    // need to show setup wizard?
    try {
      await wizardStore.getWizardConfig()

      if (!wizardStore.isComplete) {
        // show setup wizard
        router.replace(`${getStandaloneRoutePrefix()}/wizard`)
        return
      }
      // wizard already completed

      // load uci pending changes
      const uciChangesStore = useUciPendingChangesStore()
      uciChangesStore.getChanges()

      // load unit hostname
      loadHostname()

      if (justLoggedIn) {
        // go to dashboard
        router.push(`${getStandaloneRoutePrefix()}/`)
      }
    } catch (err) {
      console.error(err)
    }
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
    saveSession,
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
