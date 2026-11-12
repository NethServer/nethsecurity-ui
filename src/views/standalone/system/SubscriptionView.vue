<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UnitSubscription from '@/components/standalone/subscription/UnitSubscription.vue'
import RemoteSupport from '@/components/standalone/subscription/RemoteSupport.vue'
import { NeInlineNotification, NeHeading, getAxiosErrorMessage } from '@nethesis/vue-components'
import { useSubscriptionStore } from '@/stores/standalone/subscription.ts'

const { t } = useI18n()
const subscription = useSubscriptionStore()
</script>

<template>
  <div class="flex flex-col gap-y-8">
    <NeHeading tag="h3">{{ t('standalone.subscription.title') }}</NeHeading>
    <NeInlineNotification
      v-if="subscription.error"
      kind="error"
      :title="t('error.generic_error')"
      :description="t(getAxiosErrorMessage(subscription.error))"
    />
    <UnitSubscription />
    <hr />
    <RemoteSupport
      :enable-remote-support="!!subscription.data?.systemd_id"
      :loading="subscription.loading"
    />
  </div>
</template>
