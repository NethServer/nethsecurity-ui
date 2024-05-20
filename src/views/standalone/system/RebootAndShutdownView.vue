<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useTimer } from '@/composables/useTimer'
import { ubusCall } from '@/lib/standalone/ubus'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  NeProgressBar,
  NeHeading,
  NeButton,
  NeInlineNotification,
  NeSkeleton,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { onMounted } from 'vue'
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

const isRebooting = ref(false)

const { startTimer, currentProgress } = useTimer({
  duration: REBOOT_WAIT_TIME,
  progressStep: 0.5,
  onTimerFinish: () => {
    location.reload()
  }
})

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
      startTimer()
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

onMounted(() => {
  getHostname()
})
</script>

<template>
  <div>
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.reboot_and_shutdown.title') }}</NeHeading>
    <div class="flex flex-col gap-y-4">
      <NeHeading tag="h5" class="mb-2">{{ t('standalone.reboot_and_shutdown.reboot') }}</NeHeading>
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
        <NeHeading tag="h5" class="mb-2">{{
          t('standalone.reboot_and_shutdown.shutdown')
        }}</NeHeading>
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
    :primary-label="t('standalone.reboot_and_shutdown.shut_down_unit')"
    :title="t('standalone.reboot_and_shutdown.shutdown')"
    :primary-button-loading="isPerformingRequest"
    :primary-button-disabled="isPerformingRequest"
    :cancel-label="t('common.cancel')"
    :visible="showShutdownModal"
    kind="warning"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
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
    :close-aria-label="t('common.close')"
    @close="!isRebooting ? closeModal() : undefined"
    @primary-click="performRequest('reboot')"
  >
    <template v-if="isRebooting">
      {{ t('standalone.reboot_and_shutdown.reboot_in_progress') }}
      <NeProgressBar class="my-4" :progress="currentProgress" />
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
