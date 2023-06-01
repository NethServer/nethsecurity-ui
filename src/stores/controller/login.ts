//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isEmpty } from 'lodash'
import { getJsonFromStorage } from '@/lib/storage'
import axios from 'axios'
import { deleteFromStorage, saveToStorage } from '../../lib/storage'
import { getControllerApiEndpoint } from '../../lib/config'
import { useRouter } from 'vue-router'

export const useLoginStore = defineStore('controllerLogin', () => {
  const username = ref('')
  const accessToken = ref('')
  const refreshToken = ref('')

  const router = useRouter()

  const isLoggedIn = computed(() => {
    return !isEmpty(username.value)
  })

  const loadUserFromStorage = () => {
    const loginInfo = getJsonFromStorage('loginInfo')

    if (loginInfo) {
      username.value = loginInfo.username
      accessToken.value = loginInfo.accessToken
      refreshToken.value = loginInfo.refreshToken
    }
  }

  const login = async (user: string, password: string) => {
    console.log('login') ////

    const res = await axios.post(`${getControllerApiEndpoint()}/login`, {
      username: user,
      password
    })

    console.log('login res', res) ////

    const loginInfo = {
      username: user,
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token
    }
    saveToStorage('loginInfo', loginInfo)

    username.value = user
    accessToken.value = res.data.access_token
    refreshToken.value = res.data.refresh_token

    router.push('/')
  }

  const logout = async () => {
    console.log('logout') ////

    const res = await axios.post(
      `${getControllerApiEndpoint()}/logout`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.value}`
        }
      }
    )

    console.log('logout res', res) ////

    deleteFromStorage('loginInfo')
    username.value = ''
    accessToken.value = ''
    refreshToken.value = ''

    router.push('/')
  }

  return {
    username,
    accessToken,
    isLoggedIn,
    loadUserFromStorage,
    login,
    logout
  }
})
