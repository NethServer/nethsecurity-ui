<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { NeCard, NeSkeleton, getAxiosErrorMessage } from '@nethesis/vue-components'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

interface TunnelCounters {
  enabled: number
  connected: number
}

const props = defineProps({
  method: { type: String }
})

const { t } = useI18n()

// random refresh interval between 20 and 30 seconds
const REFRESH_INTERVAL = 20000 + Math.random() * 10 * 1000
const counters = ref<TunnelCounters>({ enabled: 0, connected: 0 })
const counterIntervalId = ref(0)

let loading = ref({
  getCounters: false
})

let error = ref({
  title: '',
  description: ''
})

onMounted(() => {
  getCounters()

  // periodically reload data
  counterIntervalId.value = setInterval(getCounters, REFRESH_INTERVAL)
})

onUnmounted(() => {
  if (counterIntervalId.value) {
    clearInterval(counterIntervalId.value)
  }
})

async function getCounters() {
  // show skeleton only the first time
  if (!counterIntervalId.value) {
    loading.value.getCounters = true
  }
  error.value.title = ''
  error.value.description = ''

  try {
    const res = await ubusCall('ns.dashboard', props.method)
    counters.value = res.data.result
  } catch (err: any) {
    console.error(err)
    error.value.title = t('error.cannot_retrieve_service_status')
    error.value.description = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getCounters = false
  }
}
</script>

<template>
  <NeCard
    :icon="['fas', 'globe']"
    :skeletonLines="2"
    :loading="loading.getCounters"
    :errorTitle="error.title"
    :errorDescription="error.description"
  >
    <!-- title slot -->
    <template #title>
      <slot name="title"></slot>
    </template>
    <div>
      <NeSkeleton v-if="loading.getCounters" :lines="1" class="w-14"></NeSkeleton>
      <div v-else>
        <div>
          <span class="text-xl">{{ counters.enabled }}</span>
          <span class="ml-2">{{
            t('standalone.dashboard.tunnels_enabled', counters.enabled)
          }}</span>
        </div>
        <div>
          <span class="text-xl">{{ counters.connected }}</span>
          <span class="ml-2">{{
            t('standalone.dashboard.tunnels_connected', counters.connected)
          }}</span>
        </div>
      </div>
    </div>
  </NeCard>
</template>
