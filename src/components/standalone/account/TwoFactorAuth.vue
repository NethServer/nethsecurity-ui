<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { onMounted, ref } from 'vue'
import { getAxiosErrorMessage, NeInlineNotification, NeSkeleton } from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCircleCheck, faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { getStandaloneApiEndpoint } from '@/lib/config.ts'
import axios from 'axios'
import { useLoginStore } from '@/stores/standalone/standaloneLogin.ts'
import ConfigureTwoFaDrawer from '@/components/standalone/account/two_fa/ConfigureTwoFaDrawer.vue'
import RevokeTwoFaModal from '@/components/standalone/account/two_fa/RevokeTwoFa.vue'
import ViewRecoveryCodes from '@/components/standalone/account/two_fa/ViewRecoveryCodes.vue'
import { useNotificationsStore } from '@/stores/notifications.ts'

const { t } = useI18n()
const notificationStore = useNotificationsStore()

const loginStore = useLoginStore()

const isTwoFaEnabled = ref(false)
const loading = ref(false)
const error = ref<Error>()
const viewRecoveryTrigger = ref(false)

type TwoFaStatus = {
  status: boolean
}

function load() {
  loading.value = true
  axios
    .get<TwoFaStatus>(`${getStandaloneApiEndpoint()}/2fa`, {
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    })
    .then((res) => {
      isTwoFaEnabled.value = res.data.status
    })
    .catch((err) => {
      error.value = err
    })
    .finally(() => {
      loading.value = false
    })
}

onMounted(() => {
  load()
})

function twoFaRevoked() {
  isTwoFaEnabled.value = false
}

function twoFaEnabled() {
  isTwoFaEnabled.value = true
  notificationStore.createNotification({
    title: t('standalone.two_fa.two_fa_configured'),
    kind: 'success',
    primaryLabel: t('standalone.two_fa.recovery_otp_codes'),
    primaryAction: () => {
      viewRecoveryTrigger.value = true
    }
  })
}
</script>

<template>
  <div class="space-y-8">
    <!-- skeleton -->
    <NeSkeleton v-if="loading" :lines="4" size="lg" />
    <!-- error management -->
    <NeInlineNotification
      v-else-if="error"
      :description="t(getAxiosErrorMessage(error))"
      :title="t('error.cannot_retrieve_two_fa_status')"
      kind="error"
    />
    <!-- 2fa status -->
    <template v-else>
      <div class="flex items-center">
        <template v-if="isTwoFaEnabled">
          <FontAwesomeIcon
            :icon="faCircleCheck"
            aria-hidden="true"
            class="mr-2 h-4 w-4 text-green-600 dark:text-green-400"
          />
          <div>
            {{ t('standalone.two_fa.two_fa_enabled') }}
          </div>
        </template>
        <template v-else>
          <FontAwesomeIcon
            :icon="faCircleInfo"
            aria-hidden="true"
            class="mr-2 h-4 w-4 text-indigo-500 dark:text-indigo-300"
          />
          <div>
            {{ t('standalone.two_fa.two_fa_disabled') }}
          </div>
        </template>
      </div>

      <!-- buttons -->
      <div v-if="isTwoFaEnabled" class="flex gap-4">
        <RevokeTwoFaModal @removed="twoFaRevoked" />
        <ViewRecoveryCodes v-model="viewRecoveryTrigger" />
      </div>
      <ConfigureTwoFaDrawer v-else @success="twoFaEnabled" />
    </template>
  </div>
</template>
