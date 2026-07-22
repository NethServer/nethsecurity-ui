<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeCard, getAxiosErrorMessage } from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDashboardOverview } from '@/composables/useDashboardOverview'

const props = defineProps<{
  method: 'ipsec-tunnels' | 'ovpn-tunnels'
}>()

const { t } = useI18n()

const { data: overview, isPending, isError, error } = useDashboardOverview()

const counters = computed(() => {
  const vpn = overview.value?.vpn
  const tunnelCounters = props.method === 'ipsec-tunnels' ? vpn?.ipsec : vpn?.ovpn
  return tunnelCounters ?? { enabled: 0, connected: 0 }
})

const errorTitle = computed(() => (isError.value ? t('error.cannot_retrieve_service_status') : ''))
const errorDescription = computed(() => (isError.value ? t(getAxiosErrorMessage(error.value)) : ''))
</script>

<template>
  <NeCard
    :icon="['fas', 'globe']"
    :skeleton-lines="2"
    :loading="isPending"
    :error-title="errorTitle"
    :error-description="errorDescription"
  >
    <!-- title slot -->
    <template #title>
      <slot name="title"></slot>
    </template>
    <div>
      <div>
        <span class="text-xl">{{ counters.enabled }}</span>
        <span class="ml-2">{{ t('standalone.dashboard.tunnels_enabled', counters.enabled) }}</span>
      </div>
      <div>
        <span class="text-xl">{{ counters.connected }}</span>
        <span class="ml-2">{{
          t('standalone.dashboard.tunnels_connected', counters.connected)
        }}</span>
      </div>
    </div>
  </NeCard>
</template>
