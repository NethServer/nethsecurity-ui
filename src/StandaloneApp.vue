<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import StandaloneAppShell from '@/components/standalone/StandaloneAppShell.vue'
import StandaloneAppLogin from '@/components/standalone/StandaloneAppLogin.vue'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { onMounted, ref } from 'vue'
import { useUciPendingChangesStore } from './stores/standalone/uciPendingChanges'
import axios from 'axios'
import { isStandaloneMode } from './lib/config'
import { useUnitManagementStore } from './stores/controller/unitManagement'
import { useRoute } from 'vue-router'

const loginStore = useLoginStore()
const uciChangesStore = useUciPendingChangesStore()
const unitManagementStore = useUnitManagementStore()
const isLoaded = ref(false)

onMounted(async () => {
  if (isStandaloneMode()) {
    await loginStore.loadUserFromStorage()
  } else {
    // a controller is managing this unit
    await unitManagementStore.load()
  }
  configureAxios() ////

  if (loginStore.isLoggedIn) {
    uciChangesStore.getChanges()
  }
  isLoaded.value = true
})

function configureAxios() {
  // axios.defaults.baseURL = getApiEndpoint() ////
  // console.log('axios.defaults.baseURL', axios.defaults.baseURL) ////

  axios.defaults.headers.post['Content-Type'] = 'application/json'
  // axios.defaults.headers.common['Authorization'] = `Bearer ${loginStore.token}` ////

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

      if (error.response?.status == 401) {
        if (isStandaloneMode()) {
          console.warn('[interceptor]', 'Detected error 401, logout')
          loginStore.logout()
        } else {
          // a controller is managing this unit
          console.warn('[interceptor]', 'Detected error 401, getting a new token for this unit')
          const route = useRoute()
          const unitName = route.params.unitName
          unitManagementStore.manageUnit(unitName as string)
          //// page refresh needed?
        }
      }
      return Promise.reject(error)
    }
  )
}
</script>

<template>
  <!-- //// skeleton? -->
  <template v-if="isLoaded">
    <template v-if="loginStore.isLoggedIn">
      <StandaloneAppShell />
    </template>
    <template v-else>
      <StandaloneAppLogin />
    </template>
  </template>
</template>
