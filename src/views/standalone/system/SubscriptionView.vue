<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UnitSubscription from '@/components/standalone/subscription/UnitSubscription.vue'
import RemoteSupport from '@/components/standalone/subscription/RemoteSupport.vue'
import { ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { onMounted } from 'vue'
import { NeInlineNotification, NeHeading, getAxiosErrorMessage } from '@nethesis/vue-components'

export type SubscriptionDataType = {
  server_id: number
  systemd_id: string
  plan: string
  expiration: number
  active: boolean
}

const { t } = useI18n()
const loading = ref(true)
const pageError = ref('')
const subscriptionData = ref<SubscriptionDataType | null>(null)

async function fetchSubscription() {
  try {
    loading.value = true
    const res = await ubusCall('ns.subscription', 'info')
    subscriptionData.value = res.data.systemd_id != '' ? res.data : null
    loading.value = false
  } catch (e: any) {
    pageError.value = getAxiosErrorMessage(e)
  }
}

onMounted(() => {
  fetchSubscription()
})
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.subscription.title') }}</NeHeading>
    <NeInlineNotification
      v-if="pageError"
      kind="error"
      :title="t('error.generic_error')"
      :description="t(pageError)"
    />
    <UnitSubscription
      :subscription-data="subscriptionData"
      :loading="loading"
      @subscription-update="fetchSubscription()"
    />
    <hr />
    <RemoteSupport :enable-remote-support="subscriptionData != null" :loading="loading" />
  </div>
</template>
