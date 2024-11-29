<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  byteFormat1024,
  getAxiosErrorMessage,
  NeCard,
  NeEmptyState,
  NeInlineNotification,
  NeSkeleton
} from '@nethesis/vue-components'
import SimpleStat from '@/components/charts/SimpleStat.vue'
import TrafficByHourChart from '@/components/standalone/monitoring/TrafficByHourChart.vue'
import { computed } from 'vue'
import { CYAN_500, CYAN_600 } from '@/lib/color'
import { useThemeStore } from '@/stores/theme'
import { useTrafficStats } from '@/composables/useTrafficStats'
import TrafficByCard from '@/components/standalone/monitoring/TrafficByCard.vue'
import { faEmptySet } from '@nethesis/nethesis-solid-svg-icons'

const { t } = useI18n()

const { loading, error, data } = useTrafficStats()
const themeStore = useThemeStore()

const hoursLabels = computed(() => {
  return data.value?.hourly_traffic.map((value) => value.id) ?? []
})

const hoursDatasets = computed(() => {
  return [
    {
      label: t('standalone.real_time_monitor.traffic'),
      backgroundColor: themeStore.isLight ? CYAN_600 : CYAN_500,
      borderColor: themeStore.isLight ? CYAN_600 : CYAN_500,
      borderRadius: 6,
      borderWidth: 1,
      radius: 0,
      data: data.value?.hourly_traffic.map((value) => value.traffic)
    }
  ]
})
</script>

<template>
  <div class="space-y-12">
    <NeSkeleton v-if="loading" :lines="10" />
    <NeInlineNotification
      v-else-if="error"
      :description="t(getAxiosErrorMessage(error.message))"
      :title="t('standalone.real_time_monitor.error_fetching_data')"
      kind="error"
    />
    <template v-else>
      <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-12">
        <NeCard
          :title="t('standalone.real_time_monitor.daily_total_traffic')"
          class="sm:col-span-6 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-3"
        >
          <SimpleStat>
            <span v-if="data?.total_traffic != 0">
              {{ byteFormat1024(data?.total_traffic) }}
            </span>
            <span v-else> N/A </span>
          </SimpleStat>
        </NeCard>
        <NeCard
          :title="t('standalone.real_time_monitor.recent_traffic')"
          class="row-span-2 sm:col-span-12 xl:col-span-9 2xl:col-span-9"
        >
          <TrafficByHourChart
            v-if="data?.hourly_traffic.length ?? 0 > 0"
            :datasets="hoursDatasets"
            :labels="hoursLabels"
            height="25vh"
          />
          <NeEmptyState
            v-else
            :title="t('standalone.real_time_monitor.no_data_available')"
            :icon="faEmptySet"
          />
        </NeCard>
      </div>
      <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TrafficByCard
          :title="t('standalone.real_time_monitor.local_hosts')"
          :data="data?.clients ?? []"
        />
        <TrafficByCard
          :title="t('standalone.real_time_monitor.applications')"
          :data="data?.applications ?? []"
        />
        <TrafficByCard
          :title="t('standalone.real_time_monitor.remote_hosts')"
          :data="data?.remote_hosts ?? []"
        />
        <TrafficByCard
          :title="t('standalone.real_time_monitor.protocols')"
          :data="data?.protocols ?? []"
        />
      </div>
    </template>
  </div>
</template>
