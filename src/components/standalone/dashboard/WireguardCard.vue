<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeCard, getAxiosErrorMessage } from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus'
import { DASHBOARD_REFRESH_INTERVAL } from '@/composables/useDashboardOverview'
import type { Tunnel } from '@/views/standalone/vpn/WireguardTunnelView.vue'

type ListServersResponse = {
  data: {
    instances: Tunnel[]
  }
}

const { t } = useI18n()

const {
  data: counters,
  isPending,
  isError,
  error
} = useQuery({
  queryKey: ['dashboard', 'wireguard', 'servers'],
  queryFn: ({ signal }) =>
    ubusCall<ListServersResponse>('ns.wireguard', 'list-servers', {}, { signal }),
  select: (res) => ({
    enabledServers: res.data.instances.filter((instance) => instance.enabled).length,
    activePeers: res.data.instances.reduce(
      (sum, instance) => sum + instance.peers.filter((peer) => peer.active).length,
      0
    )
  }),
  refetchInterval: DASHBOARD_REFRESH_INTERVAL
})

const enabledServers = computed(() => counters.value?.enabledServers ?? 0)
const activePeers = computed(() => counters.value?.activePeers ?? 0)

const errorTitle = computed(() => (isError.value ? t('error.cannot_retrieve_wireguard_stats') : ''))
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
