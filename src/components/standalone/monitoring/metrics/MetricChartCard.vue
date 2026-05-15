<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { faChartLine } from '@fortawesome/free-solid-svg-icons'
import { NeCard, NeEmptyState } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import TimeLineChart from '@/components/charts/TimeLineChart.vue'
import type { ChartData } from '@/lib/standalone/metricsCharts'

defineProps<{
  title: string
  chart: ChartData | null
  options?: object
  showLegend?: boolean
  datasetSuffix?: string
  useKbpsFormat?: boolean
  height?: string
  loading?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <NeCard :title="title" :loading="loading">
    <TimeLineChart
      v-if="chart?.labels?.length"
      :labels="chart.labels"
      :datasets="chart.datasets"
      :height="height ?? '200px'"
      :show-legend="showLegend ?? true"
      :options="options"
      :dataset-suffix="datasetSuffix ?? ''"
      :use-kbps-format="useKbpsFormat ?? false"
    />
    <NeEmptyState
      v-else
      :title="t('standalone.metrics.no_data')"
      :icon="faChartLine"
      class="bg-white dark:bg-gray-950"
    />
  </NeCard>
</template>
