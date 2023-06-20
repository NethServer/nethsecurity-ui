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
import { useI18n } from 'vue-i18n'
import { getPreference } from './lib/storage'
import { loadLocaleMessages, setI18nLanguage } from './lib/i18n'

const loginStore = useLoginStore()
const uciChangesStore = useUciPendingChangesStore()
const unitManagementStore = useUnitManagementStore()
const { locale, setLocaleMessage } = useI18n({ useScope: 'global' })

const isLoaded = ref(false)

onMounted(async () => {
  if (isStandaloneMode()) {
    await loginStore.loadUserFromStorage()
    await loadI18n()
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

async function loadI18n() {
  // default language
  let lang = navigator.language.substring(0, 2)

  // default username
  let username = 'root'

  if (loginStore.isLoggedIn) {
    username = loginStore.username
  }

  const preferredLanguage = getPreference('locale', username)

  if (preferredLanguage) {
    lang = preferredLanguage
  }
  await loadLocaleMessages(setLocaleMessage, lang)
  setI18nLanguage(locale, lang)
}

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
