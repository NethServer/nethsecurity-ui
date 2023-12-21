<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeButton, NeFormItemLabel, NeModal } from '@nethserver/vue-tailwind-lib'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '@/stores/standalone/notifications'

//// move to lib after removing ubus references

const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const justCopied = ref(false)
const isExpandedRequest = ref(false)
const isExpandedResponse = ref(false)

// just a shortcut
const axiosError = computed(() => {
  return notificationsStore.axiosErrorNotificationToShow
})

watch(
  () => notificationsStore.isAxiosErrorModalOpen,
  () => {
    if (notificationsStore.isAxiosErrorModalOpen) {
      isExpandedRequest.value = false
      isExpandedResponse.value = false
    }
  }
)

function copyCurlToClipboard() {
  if (axiosError.value) {
    notificationsStore.copyCurlToClipboard(axiosError.value)
    justCopied.value = true

    setTimeout(() => {
      justCopied.value = false
    }, 3000)
  }
}

function getFormattedJsonString(stringOrJson: any, indent: number = 4) {
  if (typeof stringOrJson === 'string') {
    return JSON.stringify(JSON.parse(stringOrJson), null, indent)
  } else {
    return JSON.stringify(stringOrJson, null, indent)
  }
}
</script>
<template>
  <NeModal
    size="lg"
    :primary-label="t('common.close')"
    :secondary-button-disabled="justCopied"
    :secondary-label="justCopied ? t('common.copied') : t('notifications.copy_curl')"
    secondary-button-kind="tertiary"
    :title="axiosError ? axiosError.title : ''"
    :visible="notificationsStore.isAxiosErrorModalOpen"
    :close-aria-label="t('common.close')"
    cancel-label=""
    kind="error"
    @close="notificationsStore.setAxiosErrorModalOpen(false)"
    @primary-click="notificationsStore.setAxiosErrorModalOpen(false)"
    @secondary-click="copyCurlToClipboard"
  >
    <div class="space-y-4">
      <!-- ubus error message (if available) -->
      <div v-if="axiosError?.payload?.response?.data?.message">
        <NeFormItemLabel class="!mb-1">
          {{ t('notifications.response_message') }}
        </NeFormItemLabel>
        <div class="font-mono">
          {{ axiosError.payload.response.data.message }}
        </div>
      </div>
      <!-- axios error message -->
      <div v-if="axiosError?.payload?.message">
        <NeFormItemLabel class="!mb-1">
          {{ t('notifications.axios_message') }}
        </NeFormItemLabel>
        <div class="font-mono">
          {{ axiosError.payload.message }}
        </div>
      </div>
      <!-- http error status -->
      <div v-if="axiosError?.payload?.response?.statusText">
        <NeFormItemLabel class="!mb-1">
          {{ t('notifications.status') }}
        </NeFormItemLabel>
        <div class="font-mono">
          {{ axiosError.payload.response.statusText }}
          <span v-if="axiosError?.payload?.response?.status">
            ({{ axiosError.payload.response.status }})
          </span>
        </div>
      </div>
      <div>
        <!-- request -->
        <NeButton
          kind="tertiary"
          size="sm"
          @click="isExpandedRequest = !isExpandedRequest"
          class="-ml-2"
        >
          <template #suffix>
            <font-awesome-icon
              :icon="['fas', isExpandedRequest ? 'chevron-up' : 'chevron-down']"
              class="h-3 w-3"
              aria-hidden="true"
            />
          </template>
          {{ t('notifications.request') }}
        </NeButton>
        <Transition name="slide-down">
          <div v-show="isExpandedRequest" class="space-y-4">
            <div>
              <div class="mt-4 font-mono">
                {{ axiosError?.payload?.config?.method?.toUpperCase() }}
                {{ axiosError?.payload?.config?.url }}
              </div>
            </div>
            <!-- request payload -->
            <div>
              <!-- //// remove w-10/12 class after fixing modal margins -->
              <pre
                v-if="axiosError?.payload?.config?.data"
                class="max-h-64 w-10/12 overflow-auto rounded-md bg-gray-100 p-2 dark:bg-gray-950"
                >{{ getFormattedJsonString(axiosError.payload.config.data) }}</pre
              >
              <div v-else>{{ t('notifications.no_payload') }}</div>
            </div>
          </div>
        </Transition>
      </div>
      <div>
        <!-- response -->
        <NeButton
          kind="tertiary"
          size="sm"
          @click="isExpandedResponse = !isExpandedResponse"
          class="-ml-2"
        >
          <template #suffix>
            <font-awesome-icon
              :icon="['fas', isExpandedResponse ? 'chevron-up' : 'chevron-down']"
              class="h-3 w-3"
              aria-hidden="true"
            />
          </template>
          {{ t('notifications.response') }}
        </NeButton>
        <Transition name="slide-down">
          <div v-show="isExpandedResponse" class="space-y-4">
            <div>
              <div class="mt-4">
                <!-- //// remove w-10/12 class after fixing modal margins -->
                <pre
                  v-if="axiosError?.payload?.response?.data"
                  class="max-h-64 w-10/12 overflow-auto rounded-md bg-gray-100 p-2 dark:bg-gray-950"
                  >{{ getFormattedJsonString(axiosError.payload.response.data) }}</pre
                >
                <div v-else>{{ t('notifications.no_payload') }}</div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </NeModal>
</template>
