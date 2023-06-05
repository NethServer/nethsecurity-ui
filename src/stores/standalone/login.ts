//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isEmpty } from 'lodash'
import { getJsonFromStorage } from '@/lib/storage'
import axios from 'axios'
import { deleteFromStorage, saveToStorage } from '../../lib/storage'
import { getStandaloneApiEndpoint } from '../../lib/config'
import { useRouter } from 'vue-router'

export const useLoginStore = defineStore('standaloneLogin', () => {
  const username = ref('')
  const token = ref('')

  const router = useRouter()

  const isLoggedIn = computed(() => {
    return !isEmpty(username.value)
  })

  // function setUsername(newUsername: string) { ////
  //   username.value = newUsername
  // }

  // function setToken(newToken: string) { ////
  //   token.value = newToken
  // }

  const loadUserFromStorage = () => {
    const loginInfo = getJsonFromStorage('standaloneLoginInfo')

    if (loginInfo) {
      username.value = loginInfo.username
      token.value = loginInfo.token
    }
  }

  const login = async (user: string, password: string) => {
    const res = await axios.post(`${getStandaloneApiEndpoint()}/login`, {
      username: user,
      password
    })

    console.log('login res', res) ////

    const jwtToken = res.data.token

    const loginInfo = {
      username: user,
      token: jwtToken
    }
    saveToStorage('standaloneLoginInfo', loginInfo)

    username.value = user
    token.value = jwtToken

    router.push('/')
  }

  const logout = async () => {
    const res = await axios.post(
      `${getStandaloneApiEndpoint()}/logout`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`
        }
      }
    )

    console.log('logout res', res) ////

    deleteFromStorage('standaloneLoginInfo')
    username.value = ''
    token.value = ''

    router.push('/')
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
