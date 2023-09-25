<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  NeButton,
  NeTitle,
  NeModal,
  NeInlineNotification,
  NeProgressBar,
  getAxiosErrorMessage,
  NeSkeleton
} from '@nethserver/vue-tailwind-lib'
import { onMounted } from 'vue'
import { onUnmounted } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

type requestType = 'poweroff' | 'reboot'
const REBOOT_WAIT_TIME = 45000

const { t } = useI18n()

const hostname = ref('')
const loading = ref(true)
const showShutdownModal = ref(false)
const showRebootModal = ref(false)
const isPerformingRequest = ref(false)
const modalRequestError = ref('')
const pageError = ref('')

const rebootProgress = ref(0)
const isRebooting = ref(false)
const rebootIntervalRef = ref<number | undefined>()
const rebootTimeoutRef = ref<number | undefined>()

async function getHostname() {
  try {
    let systemInfo = await ubusCall('system', 'board')
    hostname.value = systemInfo.data.hostname
    loading.value = false
  } catch (err: any) {
    pageError.value = t(getAxiosErrorMessage(err))
  }
}

async function performRequest(type: requestType) {
  try {
    isPerformingRequest.value = true
    await ubusCall('ns.power', type)

    if (type == 'reboot') {
      isRebooting.value = true
      setRebootTimer()
    }
  } catch (err: any) {
    modalRequestError.value = t(getAxiosErrorMessage(err))
  } finally {
    isPerformingRequest.value = false
  }
}

function closeModal() {
  showRebootModal.value = false
  showShutdownModal.value = false
  modalRequestError.value = ''
}

function setRebootTimer() {
  rebootTimeoutRef.value = setTimeout(() => {
    location.reload()
  }, REBOOT_WAIT_TIME)

  rebootIntervalRef.value = setInterval(() => {
    rebootProgress.value += 0.5
  }, REBOOT_WAIT_TIME / 200)
}

onMounted(() => {
  getHostname()
})

onUnmounted(() => {
  if (rebootTimeoutRef.value) clearTimeout(rebootTimeoutRef.value)
  if (rebootIntervalRef.value) clearInterval(rebootIntervalRef.value)
})
</script>

<template>
  <div>
    <h1 class="page-title">{{ t('standalone.reboot_and_shutdown.title') }}</h1>
    <div class="flex flex-col gap-y-4">
      <NeTitle level="h3">{{ t('standalone.reboot_and_shutdown.reboot') }}</NeTitle>
      <NeInlineNotification
        v-if="pageError"
        :title="t('error.generic_error')"
        :description="pageError"
        kind="error"
      />
      <NeSkeleton v-if="loading" :lines="6" />
      <template v-else>
        <div>
          <NeButton kind="secondary" size="lg" @click="showRebootModal = true">
            <template #prefix>
              <FontAwesomeIcon :icon="['fas', 'arrows-rotate']" aria-hidden="true" />
            </template>
            {{ t('standalone.reboot_and_shutdown.reboot_unit') }}
          </NeButton>
        </div>
        <hr class="my-4" />
        <NeTitle level="h3">{{ t('standalone.reboot_and_shutdown.shutdown') }}</NeTitle>
        <div>
          <NeButton kind="secondary" size="lg" @click="showShutdownModal = true">
            <template #prefix>
              <FontAwesomeIcon :icon="['fas', 'power-off']" aria-hidden="true" />
            </template>
            {{ t('standalone.reboot_and_shutdown.shut_down_unit') }}
          </NeButton>
        </div>
      </template>
    </div>
  </div>
  <NeModal
    :primary-label="t('standalone.reboot_and_shutdown.shutdown')"
    :title="t('standalone.reboot_and_shutdown.shutdown')"
    :primary-button-loading="isPerformingRequest"
    :primary-button-disabled="isPerformingRequest"
    :cancel-label="t('common.cancel')"
    :visible="showShutdownModal"
    kind="warning"
    primary-button-kind="danger"
    @close="closeModal()"
    @primary-click="performRequest('poweroff')"
  >
    {{ t('standalone.reboot_and_shutdown.shutdown_warning', { unit: hostname }) }}
    <NeInlineNotification
      v-if="modalRequestError"
      :title="t('error.generic_error')"
      :description="modalRequestError"
      kind="error"
      class="my-6"
    />
  </NeModal>
  <NeModal
    :primary-label="t('standalone.reboot_and_shutdown.reboot_now')"
    :primary-button-loading="isPerformingRequest || isRebooting"
    :primary-button-disabled="isPerformingRequest || isRebooting"
    :title="t('standalone.reboot_and_shutdown.reboot')"
    :cancel-label="!isRebooting ? t('common.cancel') : ''"
    :visible="showRebootModal"
    kind="warning"
    primary-button-kind="danger"
    @close="!isRebooting ? closeModal() : undefined"
    @primary-click="performRequest('reboot')"
  >
    <template v-if="isRebooting">
      {{ t('standalone.reboot_and_shutdown.reboot_in_progress') }}
      <NeProgressBar class="my-4" :progress="rebootProgress" />
    </template>
    <template v-else>
      {{ t('standalone.reboot_and_shutdown.reboot_warning', { unit: hostname }) }}
      <NeInlineNotification
        v-if="modalRequestError"
        :title="t('error.generic_error')"
        :description="modalRequestError"
        kind="error"
        class="my-6"
      />
    </template>
  </NeModal>
</template>
