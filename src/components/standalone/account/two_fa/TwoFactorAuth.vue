<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { onMounted, ref } from 'vue'
import { getTwoFaStatus } from '@/lib/twoFa'
import {
  getAxiosErrorMessage,
  NeButton,
  NeInlineNotification,
  NeSkeleton
} from '@nethesis/vue-components'
import ConfigureTwoFaDrawer from '@/components/two_fa/ConfigureTwoFaDrawer.vue'
import RevokeTwoFaModal from '@/components/two_fa/RevokeTwoFaModal.vue'
import { faCircleCheck, faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import axios from 'axios'
import { getControllerApiEndpoint, getStandaloneApiEndpoint, isStandaloneMode } from '@/lib/config'
import { useLoginStore as useStandaloneLoginStore } from '@/stores/standalone/standaloneLogin'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'

const { t } = useI18n()
const isTwoFaEnabled = ref(false)
const isShownConfigureTwoFaDrawer = ref(false)
const isShownRevokeTwoFaModal = ref(false)

const loading = ref(false)

const error = ref({
  getTwoFaStatus: '',
  getTwoFaStatusDetails: ''
})

onMounted(() => {
  loadData()
})

function loadData() {
  loadTwoFaStatus()
}

function showConfigureTwoFaDrawer() {
  isShownConfigureTwoFaDrawer.value = true
}

function hideConfigureTwoFaDrawer() {
  isShownConfigureTwoFaDrawer.value = false
}

function showRevokeTwoFaModal() {
  isShownRevokeTwoFaModal.value = true
}

async function loadTwoFaStatus() {
  loading.value = true
  error.value.getTwoFaStatus = ''
  error.value.getTwoFaStatusDetails = ''

  try {
    const res = await getTwoFaStatus()
    isTwoFaEnabled.value = res.data.enabled
  } catch (err: any) {
    console.error(err)
    error.value.getTwoFaStatus = t(getAxiosErrorMessage(err))
    error.value.getTwoFaStatusDetails = err.toString()
  } finally {
    loading.value = false
  }
}

function disableTwoFa() {
  const endpoint = isStandaloneMode() ? getStandaloneApiEndpoint() : getControllerApiEndpoint()
  const loginStore = isStandaloneMode() ? useStandaloneLoginStore() : useControllerLoginStore()
  axios
    .delete(`${endpoint}/2fa`, {
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    })
    .then(() => {
      loadData()
    })
}
</script>

<template>
  <div class="space-y-8">
    <!-- getTwoFaStatus error notification -->
    <NeInlineNotification
      v-if="error.getTwoFaStatus"
      kind="error"
      :title="t('error.cannot_retrieve_two_fa_status')"
      :description="error.getTwoFaStatus"
    >
      <template v-if="error.getTwoFaStatusDetails" #details>
        {{ error.getTwoFaStatusDetails }}
      </template>
    </NeInlineNotification>
    <!-- skeleton -->
    <NeSkeleton v-if="loading" :lines="4" size="lg" />
    <!-- 2fa status -->
    <template v-else>
      <div class="flex items-center">
        <FontAwesomeIcon
          :icon="isTwoFaEnabled ? faCircleCheck : faCircleInfo"
          :class="[
            'mr-2',
            'h-4',
            'w-4',
            isTwoFaEnabled
              ? 'text-green-600 dark:text-green-400'
              : 'text-indigo-500 dark:text-indigo-300'
          ]"
          aria-hidden="true"
        />
        <div>
          {{
            isTwoFaEnabled
              ? t('standalone.two_fa.two_fa_enabled')
              : t('standalone.two_fa.two_fa_disabled')
          }}
        </div>
      </div>
      <!-- buttons -->
      <template v-if="isTwoFaEnabled">
        <div class="flex gap-6">
          <NeButton kind="tertiary" size="lg" @click="isShownRevokeTwoFaModal = true">
            {{ t('standalone.two_fa.revoke_two_fa') }}
          </NeButton>
        </div>
      </template>
      <NeButton v-else kind="secondary" @click="showConfigureTwoFaDrawer">
        {{ t('standalone.two_fa.configure_two_fa') }}
      </NeButton>
    </template>
    <!-- configure 2fa drawer -->
    <ConfigureTwoFaDrawer
      :is-shown="isShownConfigureTwoFaDrawer"
      @close="hideConfigureTwoFaDrawer"
      @reload-data="loadData"
    />
    <!-- revoke 2fa modal -->
    <RevokeTwoFaModal
      :visible="isShownRevokeTwoFaModal"
      @close="isShownRevokeTwoFaModal = false"
      @reload-data="loadData"
    />
  </div>
</template>
