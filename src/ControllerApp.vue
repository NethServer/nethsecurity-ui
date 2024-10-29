<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ControllerAppShell from '@/components/controller/ControllerAppShell.vue'
import ControllerAppLogin from '@/components/controller/ControllerAppLogin.vue'
import { TOKEN_REFRESH_INTERVAL, useLoginStore } from '@/stores/controller/controllerLogin'
import { onMounted, ref } from 'vue'
import axios, { CanceledError } from 'axios'
import { deleteFromStorage, getPreference } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from './stores/notifications'
import { useFavicon, useTitle } from '@vueuse/core'
import { getControllerApiEndpoint, getProductName } from './lib/config'

const loginStore = useLoginStore()
const { locale } = useI18n({ useScope: 'global' })
const notificationsStore = useNotificationsStore()

const isLoaded = ref(false)

onMounted(async () => {
  await loginStore.loadUserFromStorage()
  // setup localization
  let username = 'admin'
  if (loginStore.isLoggedIn) {
    username = loginStore.username
  }
  locale.value = getPreference('locale', username) || navigator.language
  configureAxios()
  isLoaded.value = true

  // set window title
  const title = useTitle()
  title.value = `Controller - ${getProductName()}`

  // set favicon
  const favIcon = useFavicon()
  favIcon.value = '/favicon-controller.ico'
})

function configureAxios() {
  axios.defaults.headers.post['Content-Type'] = 'application/json'

  // request interceptor
  axios.interceptors.request.use(
    function (config: any) {
      // check if token needs to be refreshed
      if (
        ![
          `${getControllerApiEndpoint()}/login`,
          `${getControllerApiEndpoint()}/refresh`,
          `${getControllerApiEndpoint()}/logout`
        ].includes(config.url)
      ) {
        const now = new Date().getTime()

        // refresh token once in a while
        if (loginStore.tokenRefreshedTime + TOKEN_REFRESH_INTERVAL < now) {
          loginStore.refreshToken()
        }
      }
      return config
    },
    function (error: any) {
      return Promise.reject(error)
    }
  )

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
        if (error.config.url.includes('/ubus/call')) {
          // unit token has become invalid (e.g. ns-api-server has been restarted), let's remove it from local storage

          console.warn(
            '[interceptor]',
            'Detected error 401, removing unit token from local storage'
          )

          const matched = error.config.url.match(/^(.+:\/\/)(.+)\/(.+)\/api\/ubus\/call$/)

          if (matched.length == 4) {
            const unitId = matched[3]
            deleteFromStorage(`unit-${unitId}`)

            // show error notification
            notificationsStore.createNotificationFromAxiosError(error)
          }
        } else {
          if (error.response?.data?.message !== 'incorrect Username or Password') {
            console.warn('[interceptor]', 'Detected error 401, logout')
            loginStore.isSessionExpired = true
            loginStore.logout()
          }
        }
      } else {
        // show error notification only if error is not caused from cancellation
        // and if it isn't a validation error
        if (
          !(error instanceof CanceledError) &&
          !error.response?.data?.data?.validation?.errors?.length
        ) {
          notificationsStore.createNotificationFromAxiosError(error)
        }
      }
      return Promise.reject(error)
    }
  )
}
</script>

<template>
  <template v-if="isLoaded">
    <template v-if="loginStore.isLoggedIn">
      <ControllerAppShell />
    </template>
    <template v-else>
      <ControllerAppLogin />
    </template>
  </template>
</template>
