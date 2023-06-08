<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import StandaloneAppShell from '@/components/standalone/StandaloneAppShell.vue'
import StandaloneAppLogin from '@/components/standalone/StandaloneAppLogin.vue'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { onMounted } from 'vue'
import { useUciPendingChangesStore } from './stores/standalone/uciPendingChanges'
import axios from 'axios'
import { getStandaloneApiEndpoint } from './lib/config'

const loginStore = useLoginStore()
const uciChangesStore = useUciPendingChangesStore()

onMounted(() => {
  loginStore.loadUserFromStorage()
  configureAxios()

  if (loginStore.isLoggedIn) {
    uciChangesStore.getChanges()
  }
})

function configureAxios() {
  axios.defaults.baseURL = getStandaloneApiEndpoint()
  axios.defaults.headers.post['Content-Type'] = 'application/json' //// common instead of post?
  axios.defaults.headers.common['Authorization'] = `Bearer ${loginStore.token}`

  // response interceptor
  axios.interceptors.response.use(
    function (response) {
      return response
    },
    function (error) {
      console.error('[interceptor]', error)

      // print specific error message, if available
      if (error.response?.data?.message) {
        console.error('[interceptor]', error.response.data.message)
      }

      // logout if 401 response code is intercepted
      if (error.response?.status == 401) {
        console.warn('[interceptor]', 'Detected error 401, logout')
        loginStore.logout()
      }
      return Promise.reject(error)
    }
  )
}
</script>

<template>
  <template v-if="loginStore.isLoggedIn">
    <StandaloneAppShell />
  </template>
  <template v-else>
    <StandaloneAppLogin />
  </template>
</template>
