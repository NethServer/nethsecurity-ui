<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import {
  NeBadge,
  NeHeading,
  NeButton,
  NeInlineNotification,
  NeSkeleton,
  NeTextInput,
  focusElement,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import type { SubscriptionDataType } from '@/views/standalone/system/SubscriptionView.vue'
import type { PropType } from 'vue'
import { ref, toRefs } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { validateRequired } from '@/lib/validation'
import { computed } from 'vue'
import CancelSubscriptionModal from './CancelSubscriptionModal.vue'

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

  let { valid, errMessage } = validateRequired(authToken.value)

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
</script>

<template>
  <FormLayout
    :title="t('standalone.subscription.unit_subscription')"
    :description="t('standalone.subscription.unit_subscription_description')"
    class="max-w-3xl"
  >
    <NeSkeleton :lines="5" v-if="loading" />
    <template v-else>
      <template v-if="subscriptionData">
        <div class="flex flex-col gap-y-8">
          <NeTextInput
            :label="t('standalone.subscription.system_id')"
            :disabled="true"
            :modelValue="subscriptionData.systemd_id"
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
          <div class="align-center flex flex-row">
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
          <NeInlineNotification
            v-if="errors.request"
            kind="error"
            :title="t('error.cancel_registration_error')"
            :description="errors.request"
          />
          <div>
            <NeButton kind="tertiary" class="-ml-2.5" @click="showCancelSubscriptionModal">{{
              t('standalone.subscription.cancel_registration')
            }}</NeButton>
          </div>
        </div>
      </template>
      <template v-else>
        <form @submit.prevent>
          <NeTextInput
            :label="t('standalone.subscription.authentication_token')"
            :placeholder="t('standalone.subscription.authentication_token_placeholder')"
            :invalidMessage="errors.authToken"
            :disabled="isProcessingRequest"
            v-model.trim="authToken"
            ref="authTokenRef"
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
              @click="subscribe"
              :disabled="isProcessingRequest"
              :loading="isProcessingRequest"
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
