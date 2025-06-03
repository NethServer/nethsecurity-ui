<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSubscriptionStore } from '@/stores/standalone/subscription.ts'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'subscription-update'])

const subscriptionStore = useSubscriptionStore()
const { t } = useI18n()

const loading = ref({
  unregister: false
})

const error = ref({
  unregister: '',
  unregisterDetails: ''
})

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      error.value.unregister = ''
      error.value.unregisterDetails = ''
    }
  }
)

async function cancelSubscription() {
  error.value.unregister = ''
  error.value.unregisterDetails = ''
  loading.value.unregister = true

  try {
    await ubusCall('ns.subscription', 'unregister')
    emit('close')
    emit('subscription-update')
    subscriptionStore.loadData()
  } catch (err: any) {
    error.value.unregister = t(getAxiosErrorMessage(err))
    error.value.unregisterDetails = err.toString()
  } finally {
    loading.value.unregister = false
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('standalone.subscription.cancel_registration')"
    kind="warning"
    size="lg"
    :primary-label="t('standalone.subscription.cancel_registration')"
    :cancel-label="t('common.cancel')"
    primary-button-kind="danger"
    :primary-button-disabled="loading.unregister"
    :primary-button-loading="loading.unregister"
    :close-aria-label="t('common.close')"
    @close="emit('close')"
    @primary-click="cancelSubscription"
  >
    <div class="space-y-2">
      <p>{{ t('standalone.subscription.confirm_cancel_subscription') }}:</p>
      <ul class="list-inside list-disc">
        <li>{{ t('standalone.subscription.dpi_filter') }}</li>
        <li>{{ t('standalone.subscription.automatic_updates') }}</li>
        <li>{{ t('standalone.subscription.remote_backup') }}</li>
        <li>{{ t('standalone.subscription.remote_vpn_users_databases') }}</li>
        <li>{{ t('standalone.subscription.unlimited_controlled_units') }}</li>
        <li>{{ t('standalone.subscription.threat_shield') }}</li>
        <li>{{ t('standalone.subscription.monitoring_service') }}</li>
        <li>{{ t('standalone.subscription.remote_support') }}</li>
      </ul>
      <NeInlineNotification
        v-if="error.unregister"
        kind="error"
        :title="t('error.cancel_registration_error')"
        :description="error.unregister"
        class="my-4!"
      >
        <template v-if="error.unregisterDetails" #details>
          {{ error.unregisterDetails }}
        </template>
      </NeInlineNotification>
    </div>
  </NeModal>
</template>
