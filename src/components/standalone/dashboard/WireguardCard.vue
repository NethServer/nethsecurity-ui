<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeCard, getAxiosErrorMessage } from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDashboardOverview } from '@/composables/useDashboardOverview'

const { t } = useI18n()

const { data: overview, isPending, isError, error } = useDashboardOverview()

const enabledServers = computed(() => overview.value?.vpn.wireguard?.enabled_servers ?? 0)
const activePeers = computed(() => overview.value?.vpn.wireguard?.active_peers ?? 0)

const errorTitle = computed(() =>
  isError.value ? t('error.cannot_retrieve_wireguard_stats') : ''
)
const errorDescription = computed(() =>
  isError.value ? t(getAxiosErrorMessage(error.value)) : ''
)
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
        <span class="text-xl">{{ enabledServers }}</span>
        <span class="ml-2">
          {{ t('standalone.dashboard.wireguard_servers_enabled', enabledServers) }}
        </span>
      </div>
      <div>
        <span class="text-xl">{{ activePeers }}</span>
        <span class="ml-2">
          {{ t('standalone.dashboard.wireguard_peers_active', activePeers) }}
        </span>
      </div>
    </div>
  </NeCard>
</template>
