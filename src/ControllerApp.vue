<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ControllerAppShell from '@/components/controller/ControllerAppShell.vue'
import ControllerAppLogin from '@/components/controller/ControllerAppLogin.vue'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import { onMounted, ref } from 'vue'
import axios from 'axios'

const isLoaded = ref(false)

const loginStore = useLoginStore()

onMounted(async () => {
  await loginStore.loadUserFromStorage()
  configureAxios()
  isLoaded.value = true
})

function configureAxios() {
  axios.defaults.headers.post['Content-Type'] = 'application/json'

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
  <!-- //// skeleton? -->
  <template v-if="isLoaded">
    <template v-if="loginStore.isLoggedIn">
      <ControllerAppShell />
    </template>
    <template v-else>
      <ControllerAppLogin />
    </template>
  </template>
</template>
