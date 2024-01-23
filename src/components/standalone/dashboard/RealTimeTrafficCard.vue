<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { NeCard } from '@nethesis/vue-components'
import { getAxiosErrorMessage, kbpsFormat } from '@nethserver/vue-tailwind-lib'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import NeTable from '@/components/standalone/NeTable.vue'

const { t } = useI18n()
const REFRESH_INTERVAL = 10000
const NUM_HOSTS = 5
const topTalkersIntervalId = ref(0)
const topTalkers = ref([])

const tableHeaders = [
  {
    label: t('standalone.dashboard.host'),
    key: 'host'
  },
  {
    label: t('standalone.dashboard.traffic'),
    key: 'traffic'
  }
]

let loading = ref({
  getTopTalkers: true
})

let error = ref({
  title: '',
  description: ''
})

onMounted(() => {
  getTopTalkers()

  // periodically reload top talkers
  topTalkersIntervalId.value = setInterval(getTopTalkers, REFRESH_INTERVAL)
})

onUnmounted(() => {
  if (topTalkersIntervalId.value) {
    clearInterval(topTalkersIntervalId.value)
  }
})

function formatTraffic(value: number) {
  return kbpsFormat((value / 1000) * 8)
}

async function getTopTalkers() {
  error.value.title = ''
  error.value.description = ''

  try {
    const res = await ubusCall('ns.talkers', 'list', {
      limit: NUM_HOSTS
    })
    topTalkers.value = res.data.talkers.map((row: any) => {
      return { host: row.host, traffic: formatTraffic(row.totals.bandwidth) }
    })
  } catch (err: any) {
    console.error(err)
    error.value.title = t('error.cannot_retrieve_realtime_traffic')
    error.value.description = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getTopTalkers = false
  }
}
</script>

<template>
  <NeCard
    :title="t('standalone.dashboard.real_time_traffic')"
    :skeletonLines="5"
    :loading="loading.getTopTalkers"
    :errorTitle="error.title"
    :errorDescription="error.description"
  >
    <div class="mt-3">
      <NeTable
        :data="topTalkers"
        :headers="tableHeaders"
        :loading="loading.getTopTalkers"
        :skeletonLines="5"
        ghost
        condensed
      />
    </div>
  </NeCard>
</template>
