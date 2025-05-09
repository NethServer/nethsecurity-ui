<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import StandaloneAppShell from '@/components/standalone/StandaloneAppShell.vue'
import StandaloneAppLogin from '@/components/standalone/StandaloneAppLogin.vue'
import { TOKEN_REFRESH_INTERVAL, useLoginStore } from '@/stores/standalone/standaloneLogin'
import { onMounted, ref } from 'vue'
import axios, { type AxiosRequestConfig, CanceledError } from 'axios'
import { getStandaloneApiEndpoint, isStandaloneMode } from './lib/config'
import { useUnitsStore } from './stores/controller/units'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getPreference } from '@nethesis/vue-components'
import { useNotificationsStore } from './stores/notifications'
import { UnauthorizedAction, useSudoStore } from '@/stores/standalone/sudo.ts'
import AskSudoPasswordModal from '@/components/standalone/AskSudoPasswordModal.vue'
import WizardShell from './views/standalone/wizard/WizardShell.vue'
import ToastNotificationsArea from './components/ToastNotificationsArea.vue'

const loginStore = useLoginStore()
const unitsStore = useUnitsStore()
const notificationsStore = useNotificationsStore()
const { locale } = useI18n({ useScope: 'global' })
const route = useRoute()
const sudoStore = useSudoStore()

const isLoaded = ref(false)

onMounted(async () => {
  if (isStandaloneMode()) {
    await loginStore.loadUserFromStorage()
    // Setup localization
    let username = 'root'
    if (loginStore.isLoggedIn) {
      username = loginStore.username
    }
    locale.value = getPreference('locale', username) || navigator.language
  } else {
    // a controller is managing this unit
    await unitsStore.load()
  }
  configureAxios()

  if (loginStore.isLoggedIn) {
    await loginStore.loadAppData()
    isLoaded.value = true
  } else {
    isLoaded.value = true
  }
})

function configureAxios() {
  axios.defaults.headers.post['Content-Type'] = 'application/json'

  // request interceptor
  axios.interceptors.request.use(
    function (config: any) {
      // check if token needs to be refreshed
      if (
        ![
          `${getStandaloneApiEndpoint()}/login`,
          `${getStandaloneApiEndpoint()}/refresh`,
          `${getStandaloneApiEndpoint()}/logout`
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

      if (error.response?.status == 401) {
        if (isStandaloneMode()) {
          if (error.response?.data?.message !== 'incorrect Username or Password') {
            console.warn('[interceptor]', 'Detected error 401, logout')
            loginStore.isSessionExpired = true
            loginStore.logout()
          }
        } else {
          // a controller is managing this unit
          console.warn('[interceptor]', 'Detected error 401, getting a new token for this unit')

          const unitId = route.params.unitId
          unitsStore.retrieveAndSaveUnitToken(unitId as string)
        }
      } else if (
        error.response?.status == 403 &&
        error.response?.data?.message == 'sudo mode required'
      ) {
        console.warn(
          '[interceptor]',
          'Detected sudo mode requirement, asking for sudo to request new token'
        )
        // showing the modal that asks for sudo password
        sudoStore.askingSudo = true
        // request need to be retried or cancelled based off what happens in the modal
        // this return allows minimal changes in the functions we want to protect with the sudo form
        return new Promise((resolve, reject) => {
          // check if token is granted every 200ms
          const interval = setInterval(() => {
            if (sudoStore.askingSudo == false) {
              // modal closed, stop checking
              clearInterval(interval)
              if (sudoStore.sudoEnabled) {
                // signaling received, stop checking
                sudoStore.sudoEnabled = false
                // change the token in the previous request, then send it again
                const config: AxiosRequestConfig = error.config
                config.headers!['Authorization'] = `Bearer ${loginStore.token}`
                resolve(axios(config))
              } else {
                // user cancelled the request
                reject(new UnauthorizedAction())
              }
            }
          }, 200)
        })
      } else {
        // show error notification only if error is not caused from cancellation
        // and if it isn't a validation error
        // and if it isn't caused by one of the update endpoints because of the system rebooting
        // and if it isn't caused by a net::ERR_CONNECTION_REFUSED when applying a migration (probably because of nginx restarting or the machine's ip addresses changing)
        if (
          !(error instanceof CanceledError) &&
          !error.response?.data?.data?.validation?.errors?.length &&
          !(
            error.config.url.includes('/ubus/call') &&
            (JSON.parse(error.config.data)?.method === 'install-uploaded-image' ||
              JSON.parse(error.config.data)?.method === 'update-system') &&
            // if the error is caused by a system reboot, the response will not have a payload (since it's caused by a net::ERR_CONNECTION_REFUSED)
            (!error.response || !error.response.data)
          ) &&
          !(
            error.config.url.includes('/ubus/call') &&
            (JSON.parse(error.config.data)?.path === 'ns.migration' ||
              JSON.parse(error.config.data)?.method === 'upload') &&
            (!error.response || !error.response.data)
          )
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
      <StandaloneAppShell v-if="route.path !== '/standalone/wizard'" />
      <template v-else>
        <WizardShell />
        <ToastNotificationsArea />
      </template>
      <AskSudoPasswordModal />
    </template>
    <template v-else>
      <StandaloneAppLogin />
    </template>
  </template>
</template>
