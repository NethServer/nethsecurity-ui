<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import {
  focusElement,
  formatDateLoc,
  getAxiosErrorMessage,
  NeBadge,
  NeButton,
  NeHeading,
  NeInlineNotification,
  NeSkeleton,
  NeTextInput
} from '@nethesis/vue-components'
import type { SubscriptionDataType } from '@/views/standalone/system/SubscriptionView.vue'
import { computed, onMounted, type PropType, ref, toRefs } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { validateRequired } from '@/lib/validation'
import CancelSubscriptionModal from './CancelSubscriptionModal.vue'
import { useSubscriptionStore } from '@/stores/standalone/subscription.ts'
import type { AxiosResponse } from 'axios'

const { t } = useI18n()

const props = defineProps({
  subscriptionData: {
    type: Object as PropType<SubscriptionDataType | null>,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})
const { subscriptionData, loading } = toRefs(props)
const emit = defineEmits(['subscription-update'])

const authTokenRef = ref()
const authToken = ref('')
const isProcessingRequest = ref(false)
const isShownCancelSubscriptionModal = ref(false)
const subscriptionStore = useSubscriptionStore()

const errors = ref({
  authToken: '',
  request: ''
})

const expirationDateString = computed(() => {
  if (!subscriptionData.value) {
    return ''
  }

  return subscriptionData.value.expiration == 0
    ? t('standalone.subscription.no_expiration')
    : new Date(subscriptionData.value.expiration).toLocaleDateString()
})

function validateAuthToken() {
  errors.value.authToken = ''

  const { valid, errMessage } = validateRequired(authToken.value)

  if (!valid) {
    errors.value.authToken = t(errMessage as string)
    focusElement(authTokenRef)
  }

  return valid
}

async function subscribe() {
  try {
    errors.value.request = ''

    if (!validateAuthToken()) {
      return
    }

    isProcessingRequest.value = true
    await ubusCall('ns.subscription', 'register', { secret: authToken.value })
    authToken.value = ''
    emit('subscription-update')
    subscriptionStore.loadData()
  } catch (e: any) {
    if (e.response.data.message == 'invalid_secret_or_server_not_found') {
      errors.value.request = t('standalone.subscription.invalid_secret_or_server_not_found')
    } else {
      errors.value.request = t(getAxiosErrorMessage(e))
    }
  } finally {
    isProcessingRequest.value = false
  }
}

function showCancelSubscriptionModal() {
  isShownCancelSubscriptionModal.value = true
}

type InventoryCodes = 'not attempted' | 'success' | 'error'

type InventoryStatus =
  | {
      status: Exclude<InventoryCodes, 'success' | 'error'>
    }
  | {
      status: Exclude<InventoryCodes, 'not attempted'>
      last_attempt: string
    }

type InventoryStatusResponse = AxiosResponse<InventoryStatus>

const errorLastSync = ref<Error>()
const loadingLastSync = ref(true)
const lastSyncStatus = ref<InventoryStatus>()

function fetchLastSyncStatus() {
  errorLastSync.value = undefined
  ubusCall('ns.subscription', 'inventory-status')
    .then((response: InventoryStatusResponse) => {
      lastSyncStatus.value = response.data
    })
    .catch((reason) => {
      errorLastSync.value = reason
    })
    .finally(() => {
      loadingLastSync.value = false
    })
}

onMounted(() => {
  fetchLastSyncStatus()
})

const loadingRequestSync = ref(false)
const errorRequestSync = ref<Error>()

function requestSync() {
  loadingRequestSync.value = true
  errorRequestSync.value = undefined
  ubusCall('ns.subscription', 'send-inventory')
    .then(() => {
      fetchLastSyncStatus()
    })
    .catch((reason) => {
      errorRequestSync.value = reason
    })
    .finally(() => {
      loadingRequestSync.value = false
    })
}
</script>

<template>
  <FormLayout
    :title="t('standalone.subscription.unit_subscription')"
    :description="t('standalone.subscription.unit_subscription_description')"
    class="max-w-3xl"
  >
    <NeSkeleton v-if="loading" :lines="5" />
    <template v-else>
      <template v-if="subscriptionData">
        <div class="flex flex-col gap-y-8">
          <NeTextInput
            :label="t('standalone.subscription.system_id')"
            :disabled="true"
            :model-value="subscriptionData.systemd_id"
          />
          <div>
            <NeHeading tag="h6" class="mb-1.5">{{ t('standalone.subscription.plan') }}</NeHeading>
            <p class="text-sm font-normal text-gray-500 dark:text-gray-400">
              {{ subscriptionData.plan }}
            </p>
          </div>
          <div>
            <NeHeading tag="h6" class="mb-1.5">{{
              t('standalone.subscription.expiration')
            }}</NeHeading>
            <p class="text-sm font-normal text-gray-500 dark:text-gray-400">
              {{ expirationDateString }}
            </p>
          </div>
          <div class="align-center flex">
            <NeHeading tag="h6" class="!mb-0 mr-4 inline-block">{{
              t('standalone.subscription.status')
            }}</NeHeading>
            <NeBadge
              :text="
                subscriptionData.active
                  ? t('standalone.subscription.active')
                  : t('standalone.subscription.inactive')
              "
              :kind="subscriptionData.active ? 'success' : 'warning'"
              size="sm"
            />
          </div>
          <div class="-mt-6">
            <NeSkeleton v-if="loadingLastSync" :lines="1" />
            <p
              v-else-if="lastSyncStatus?.status != 'not attempted'"
              class="text-sm font-normal text-gray-500 dark:text-gray-400"
            >
              <template v-if="lastSyncStatus?.status == 'error'">
                {{
                  t('standalone.subscription.last_attempted_sync', {
                    date: formatDateLoc(new Date(lastSyncStatus.last_attempt), 'PPpp')
                  })
                }}
              </template>
              <template v-else-if="lastSyncStatus?.status == 'success'">
                {{
                  t('standalone.subscription.last_sync', {
                    date: formatDateLoc(new Date(lastSyncStatus.last_attempt), 'PPpp')
                  })
                }}
              </template>
            </p>
          </div>
          <template v-if="!loadingLastSync">
            <NeInlineNotification
              v-if="errorLastSync != undefined"
              :description="t(getAxiosErrorMessage(errorLastSync))"
              :title="t('error.sync_error')"
              kind="error"
            />
            <NeInlineNotification
              v-if="lastSyncStatus?.status == 'not attempted'"
              :description="t('standalone.subscription.sync_not_attempted_description')"
              :title="t('standalone.subscription.sync_not_attempted')"
              kind="info"
            />
            <NeInlineNotification
              v-if="lastSyncStatus?.status == 'error'"
              :description="t('standalone.subscription.sync_error_description')"
              :title="t('standalone.subscription.sync_error')"
              kind="warning"
            />
          </template>
          <NeInlineNotification
            v-if="errors.request"
            kind="error"
            :title="t('error.cancel_registration_error')"
            :description="errors.request"
          />
          <div class="flex gap-4">
            <NeButton
              :disabled="loadingRequestSync"
              :loading="loadingRequestSync"
              kind="secondary"
              @click="requestSync"
            >
              {{ t('standalone.subscription.sync_now') }}
            </NeButton>
            <NeButton kind="tertiary" @click="showCancelSubscriptionModal">
              {{ t('standalone.subscription.cancel_registration') }}
            </NeButton>
          </div>
        </div>
      </template>
      <template v-else>
        <form @submit.prevent>
          <NeTextInput
            ref="authTokenRef"
            v-model.trim="authToken"
            :label="t('standalone.subscription.authentication_token')"
            :placeholder="t('standalone.subscription.authentication_token_placeholder')"
            :invalid-message="errors.authToken"
            :disabled="isProcessingRequest"
          />
          <NeInlineNotification
            v-if="errors.request"
            kind="error"
            :title="t('error.register_unit_error')"
            :description="errors.request"
            class="my-4"
          />
          <div class="mt-6 flex justify-end">
            <NeButton
              type="submit"
              kind="primary"
              :disabled="isProcessingRequest"
              :loading="isProcessingRequest"
              @click="subscribe"
              >{{ t('standalone.subscription.register') }}</NeButton
            >
          </div>
        </form>
      </template>
    </template>
  </FormLayout>
  <!-- cancel subscription modal -->
  <CancelSubscriptionModal
    :visible="isShownCancelSubscriptionModal"
    @close="isShownCancelSubscriptionModal = false"
    @subscription-update="emit('subscription-update')"
  />
</template>
