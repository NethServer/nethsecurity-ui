<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { NeCard, getAxiosErrorMessage } from '@nethesis/vue-components'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIntervalFn } from '@vueuse/core'
import type { Tunnel } from '@/views/standalone/vpn/WireguardTunnelView.vue'

const { t } = useI18n()

const enabledServers = ref(0)
const activePeers = ref(0)
const loading = ref(true)
const error = ref<Error>()

async function getCounters() {
  error.value = undefined

  try {
    const res = await ubusCall('ns.wireguard', 'list-servers')
    const instances: Tunnel[] = res.data.instances

    // Count enabled servers
    enabledServers.value = instances.filter((instance: Tunnel) => instance.enabled).length

    // Count active peers across all servers
    activePeers.value = 0
    instances.forEach((instance: Tunnel) => {
      activePeers.value += instance.peers.filter((peer) => peer.active).length
    })
  } catch (err) {
    error.value = err as Error
  } finally {
    loading.value = false
  }
}

// random refresh interval between 20 and 30 seconds
const REFRESH_INTERVAL = (20 + Math.random() * 10) * 1000

useIntervalFn(
  () => {
    getCounters()
  },
  REFRESH_INTERVAL,
  {
    immediateCallback: true
  }
)
</script>

<template>
  <NeCard
    :icon="['fas', 'globe']"
    :skeleton-lines="2"
    :loading="loading"
    :error-title="error ? t('error.cannot_retrieve_wireguard_stats') : ''"
    :error-description="error ? t(getAxiosErrorMessage(error)) : ''"
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
