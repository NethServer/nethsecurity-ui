<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeCard } from '@nethesis/vue-components'
import { toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import MetricChartCard from './MetricChartCard.vue'
import { useMetricsCharts, type MetricsData } from '@/composables/useMetricsCharts'

const props = defineProps<{
  metrics: MetricsData | null
  loading: boolean
}>()

const { t } = useI18n()

const {
  cpuChart,
  loadChart,
  diskioChart,
  diskChart,
  processesChart,
  memoryChart,
  byteAxisOptions
} = useMetricsCharts(toRef(props, 'metrics'))
</script>

<template>
  <div>
    <h4 class="mb-4 text-sm font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300">
      {{ t('standalone.metrics.system_section') }}
    </h4>
    <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-12">
      <!-- skeleton -->
      <template v-if="loading">
        <NeCard
          v-for="i in 6"
          :key="i"
          loading
          :skeleton-lines="6"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4"
        />
      </template>
      <template v-else>
        <!-- CPU Usage -->
        <MetricChartCard
          :title="t('standalone.metrics.cpu')"
          :chart="cpuChart"
          dataset-suffix="%"
          :show-legend="false"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4"
        />
        <!-- System Load -->
        <MetricChartCard
          :title="t('standalone.metrics.load')"
          :chart="loadChart"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4"
        />
        <!-- Disk I/O -->
        <MetricChartCard
          :title="t('standalone.metrics.diskio')"
          :chart="diskioChart"
          :options="byteAxisOptions"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4"
        />
        <!-- Disk Usage per partition -->
        <MetricChartCard
          :title="t('standalone.metrics.disk')"
          :chart="diskChart"
          dataset-suffix="%"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4"
        />
        <!-- Total Processes -->
        <MetricChartCard
          :title="t('standalone.metrics.processes')"
          :chart="processesChart"
          :show-legend="false"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4"
        />
        <!-- RAM Usage -->
        <MetricChartCard
          :title="t('standalone.metrics.memory')"
          :chart="memoryChart"
          dataset-suffix="MB"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4"
        />
      </template>
    </div>
  </div>
</template>
