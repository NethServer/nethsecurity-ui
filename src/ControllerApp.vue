<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ControllerAppShell from '@/components/controller/ControllerAppShell.vue'
import ControllerAppLogin from '@/components/controller/ControllerAppLogin.vue'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import { nextTick, onMounted, ref } from 'vue'
import axios, { CanceledError } from 'axios'
import { deleteFromStorage, getPreference } from '@nethesis/vue-components'
import { loadLocaleMessages, setI18nLanguage } from './lib/i18n'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from './stores/notifications'
import { useFavicon } from '@vueuse/core'

const loginStore = useLoginStore()
const { locale, setLocaleMessage } = useI18n({ useScope: 'global' })
const notificationsStore = useNotificationsStore()

const isLoaded = ref(false)

onMounted(async () => {
  await loginStore.loadUserFromStorage()
  await loadI18n()
  configureAxios()
  isLoaded.value = true

  // set controller favicon
  const favIcon = useFavicon()
  favIcon.value = '/favicon-controller.ico'
})

async function loadI18n() {
  // default language
  let lang = navigator.language.substring(0, 2)

  // default username
  let username = 'admin'

  if (loginStore.isLoggedIn) {
    username = loginStore.username
  }

  const preferredLanguage = getPreference('locale', username)

  if (preferredLanguage) {
    lang = preferredLanguage
  }
  // load preferred or navigator language, falling back to English
  const actualLang = await loadLocaleMessages(setLocaleMessage, lang)
  await nextTick()

  if (actualLang) {
    setI18nLanguage(locale, actualLang)
  }
}

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
          console.warn('[interceptor]', 'Detected error 401, logout')
          loginStore.logout()
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
