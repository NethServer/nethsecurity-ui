<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import SimpleStat from '@/components/charts/SimpleStat.vue'
import { NeCard } from '@nethesis/vue-components'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OvpnUser } from '../VpnMonitor.vue'

const props = defineProps<{
  ovpnInstance: string
  ovpnUsers: OvpnUser[]
}>()

const { t } = useI18n()

const loading = ref(false)

const connectedClientsText = computed(() => {
  const connected = props.ovpnUsers.filter((client: any) => client.connected)
  const totalUsers = props.ovpnUsers.length
  return `${connected.length}/${totalUsers}`
})
</script>

<template>
  <NeCard
    :title="t('standalone.real_time_monitor.connected_clients')"
    :loading="loading"
    :skeletonLines="2"
  >
    <SimpleStat class="mt-1">
      {{ connectedClientsText }}
    </SimpleStat>
  </NeCard>
</template>
