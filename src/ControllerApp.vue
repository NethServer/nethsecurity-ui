<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ControllerAppShell from '@/components/controller/ControllerAppShell.vue'
import ControllerAppLogin from '@/components/controller/ControllerAppLogin.vue'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import { nextTick, onMounted, ref } from 'vue'
import axios from 'axios'
import { getPreference } from '@nethserver/vue-tailwind-lib'
import { loadLocaleMessages, setI18nLanguage } from './lib/i18n'
import { useI18n } from 'vue-i18n'

const loginStore = useLoginStore()
const { locale, setLocaleMessage } = useI18n({ useScope: 'global' })

const isLoaded = ref(false)

onMounted(async () => {
  await loginStore.loadUserFromStorage()
  await loadI18n()
  configureAxios()
  isLoaded.value = true
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
