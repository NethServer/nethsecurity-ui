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
import { getControllerRoutePrefix } from '@/lib/router'

export const useLoginStore = defineStore('controllerLogin', () => {
  const username = ref('')
  const token = ref('')

  const router = useRouter()

  const isLoggedIn = computed(() => {
    return !isEmpty(username.value)
  })

  const loadUserFromStorage = () => {
    const loginInfo = getJsonFromStorage('controllerLoginInfo')

    if (loginInfo) {
      username.value = loginInfo.username
      token.value = loginInfo.token
    }
  }

  const login = async (user: string, password: string) => {
    const res = await axios.post(`${getControllerApiEndpoint()}/login`, {
      username: user,
      password
    })

    console.log('login res', res) ////

    const jwtToken = res.data.token

    const loginInfo = {
      username: user,
      token: jwtToken
    }
    saveToStorage('controllerLoginInfo', loginInfo)

    username.value = user
    token.value = jwtToken
    router.push(`${getControllerRoutePrefix()}/`)
  }

  const logout = async () => {
    const res = await axios.post(
      `${getControllerApiEndpoint()}/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      }
    )

    console.log('logout res', res) ////

    deleteFromStorage('controllerLoginInfo')
    username.value = ''
    token.value = ''
    router.push(`${getControllerRoutePrefix()}/`)
  }

  return {
    username,
    token,
    isLoggedIn,
    loadUserFromStorage,
    login,
    logout
  }
})
