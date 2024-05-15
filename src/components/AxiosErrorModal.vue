<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeFormItemLabel, NeLink, NeTooltip } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { computed, ref, toRaw, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '@/stores/notifications'
import { getProductName } from '@/lib/config'

const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const justCopied = ref(false)
const isExpandedRequest = ref(false)
const isExpandedResponse = ref(false)

// just a shortcut
const axiosError = computed(() => {
  return notificationsStore.axiosErrorNotificationToShow
})

const isUbusCall = computed(() => {
  return axiosError.value?.payload?.config.url.includes('/ubus/call')
})

const callFailed = computed(() => {
  if (isUbusCall.value) {
    const ubusPath = JSON.parse(axiosError.value?.payload.config.data).path
    const ubusMethod = JSON.parse(axiosError.value?.payload.config.data).method
    return `${ubusPath} ${ubusMethod}`
  } else {
    // api call
    const httpMethod = axiosError.value?.payload.config.method.toUpperCase()
    const apiUrl = axiosError.value?.payload.config.url
    return `${httpMethod} ${apiUrl}`
  }
})

watch(
  () => notificationsStore.isAxiosErrorModalOpen,
  () => {
    if (notificationsStore.isAxiosErrorModalOpen) {
      isExpandedRequest.value = false
      isExpandedResponse.value = false

      // print the error object on the console
      console.info(toRaw(axiosError.value?.payload))
    }
  }
)

function copyCommandToClipboard() {
  if (axiosError.value) {
    notificationsStore.copyCommandToClipboard(axiosError.value)
    justCopied.value = true

    setTimeout(() => {
      justCopied.value = false
    }, 3000)
  }
}
</script>
<template>
  <NeModal
    size="lg"
    :primary-label="t('common.close')"
    :title="axiosError ? axiosError.title : ''"
    :visible="notificationsStore.isAxiosErrorModalOpen"
    :close-aria-label="t('common.close')"
    cancel-label=""
    kind="error"
    @close="notificationsStore.setAxiosErrorModalOpen(false)"
    @primary-click="notificationsStore.setAxiosErrorModalOpen(false)"
  >
    <div class="space-y-6">
      <div>
        <NeFormItemLabel class="!mb-1">
          {{ t('error_modal.request_failed') }}
        </NeFormItemLabel>
        <div class="font-mono">
          {{ callFailed }}
        </div>
      </div>
      <div>
        <div class="mb-1">{{ t('error_modal.report_issue_description') }}:</div>
        <ol class="list-inside list-decimal">
          <li>
            <i18n-t keypath="error_modal.report_issue_step_1" tag="span" scope="global">
              <template #copyTheCommand>
                <NeTooltip v-if="justCopied" triggerEvent="mouseenter focus" placement="top-start">
                  <template #trigger>
                    <NeLink @click="copyCommandToClipboard">
                      {{ t('error_modal.copy_the_command') }}
                    </NeLink>
                  </template>
                  <template #content>
                    {{ t('common.copied') }}
                  </template>
                </NeTooltip>
                <NeLink v-else @click="copyCommandToClipboard">
                  {{ t('error_modal.copy_the_command') }}
                </NeLink>
              </template>
            </i18n-t>
          </li>
          <li>
            {{ t('error_modal.report_issue_step_2', { product: getProductName() }) }}
          </li>
          <li>
            {{ t('error_modal.report_issue_step_3') }}
          </li>
        </ol>
      </div>
    </div>
  </NeModal>
</template>
