<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  NeHeading,
  NeButton,
  NeInlineNotification,
  NeSkeleton,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { onMounted, onUnmounted } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

type requestType = 'poweroff' | 'reboot'
const POLL_INTERVAL = 3000
const INITIAL_WAIT = 5000
const POLL_TIMEOUT = 60000 * 3 // 3 minutes

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

const hostname = ref('')
const loading = ref(true)
const showShutdownModal = ref(false)
const showRebootModal = ref(false)
const isPerformingRequest = ref(false)
const modalRequestError = ref('')
const pageError = ref('')

const isRebooting = ref(false)
const isServerBackOnline = ref(false)
const rebootError = ref(false)
let pollIntervalId: ReturnType<typeof setInterval> | null = null
let pollTimeoutId: ReturnType<typeof setTimeout> | null = null

async function checkServerAvailability() {
  try {
    const response = await fetch('/', { method: 'HEAD' })
    if (response.ok) {
      // Server is back online, wait a bit before reloading the page
      stopPolling()
      isServerBackOnline.value = true
      setTimeout(() => {
        location.reload()
      }, 2000)
    }
  } catch {
    // Server still offline, continue polling
  }
}

function startPolling() {
  // Wait a bit before starting to poll to give the server time to go down
  setTimeout(() => {
    pollIntervalId = setInterval(checkServerAvailability, POLL_INTERVAL)
  }, INITIAL_WAIT)

  // Set a timeout to stop polling and show error if server doesn't come back
  pollTimeoutId = setTimeout(() => {
    stopPolling()
    rebootError.value = true
  }, POLL_TIMEOUT)
}

function stopPolling() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId)
    pollIntervalId = null
  }
  if (pollTimeoutId) {
    clearTimeout(pollTimeoutId)
    pollTimeoutId = null
  }
}

async function getHostname() {
  try {
    const systemInfo = await ubusCall('system', 'board')
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
      startPolling()
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

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div>
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.reboot_and_shutdown.title') }}</NeHeading>
    <div class="flex flex-col gap-y-4">
      <NeHeading tag="h5" class="mb-2">{{ t('standalone.reboot_and_shutdown.reboot') }}</NeHeading>
      <p class="text-sm font-normal text-secondary-neutral">
        {{ t('standalone.reboot_and_shutdown.reboot_description') }}
      </p>
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
        <p class="text-sm font-normal text-secondary-neutral">
          {{ t('standalone.reboot_and_shutdown.shutdown_description') }}
        </p>
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
      v-if="uciChangesStore.numChanges > 0"
      kind="warning"
      :title="t('standalone.reboot_and_shutdown.pending_changes_warning_shutdown')"
      class="my-6"
    />
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
      <template v-if="rebootError">
        <NeInlineNotification
          kind="error"
          :title="t('standalone.reboot_and_shutdown.reboot_timeout_error')"
        />
      </template>
      <div v-else class="flex items-center gap-4">
        <template v-if="isServerBackOnline">
          {{ t('standalone.reboot_and_shutdown.reboot_completed') }}
        </template>
        <template v-else>
          {{ t('standalone.reboot_and_shutdown.reboot_in_progress') }}
        </template>
      </div>
    </template>
    <template v-else>
      {{ t('standalone.reboot_and_shutdown.reboot_warning', { unit: hostname }) }}
      <NeInlineNotification
        v-if="uciChangesStore.numChanges > 0"
        kind="warning"
        :title="t('standalone.reboot_and_shutdown.pending_changes_warning_reboot')"
        class="my-4"
      />
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
