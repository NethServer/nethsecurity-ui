<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeDropdownFilter,
  NeHeading,
  NeInlineNotification
} from '@nethesis/vue-components'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MetricChartCard from './MetricChartCard.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { useQuery } from '@tanstack/vue-query'
import type { AxiosResponse } from 'axios'
import { useThemeStore } from '@/stores/theme'
import {
  buildCpuChart,
  buildLoadChart,
  buildDiskioChart,
  buildDiskChart,
  buildProcessesChart,
  buildMemoryChart,
  buildPacketsChart,
  buildConnectionsChart,
  buildTrafficChart,
  buildLatencyChart,
  buildQualityChart,
  getTrafficInterfaces,
  getInterfaceDisplayName,
  getLatencyQuality,
  byteAxisOptions,
  latencyOptions,
  qualityOptions,
  type MetricsData,
  type PingHost
} from '@/lib/standalone/metricsCharts'
import { useStorage } from '@vueuse/core'

const { t } = useI18n()
const themeStore = useThemeStore()

const { interval } = defineProps<{
  interval: number | false
}>()

const emits = defineEmits<{
  updatedAt: [number]
}>()

type TimeRangeId = '5m' | '30m' | '1h' | '12h' | '24h' | '7d'
type TimeRange = {
  id: TimeRangeId
  label: string
  num: number
  seconds: number
  step: number
}

const TIME_RANGES: TimeRange[] = [
  {
    id: '5m',
    label: t('standalone.metrics.time_range_minutes', { count: 5 }),
    num: 5,
    seconds: 300,
    step: 5
  },
  {
    id: '30m',
    label: t('standalone.metrics.time_range_minutes', { count: 30 }),
    num: 30,
    seconds: 1800,
    step: 30
  },
  {
    id: '1h',
    label: t('standalone.metrics.time_range_hours', { count: 1 }),
    num: 1,
    seconds: 3600,
    step: 60
  },
  {
    id: '12h',
    label: t('standalone.metrics.time_range_hours', { count: 12 }),
    num: 12,
    seconds: 43200,
    step: 300
  },
  {
    id: '24h',
    label: t('standalone.metrics.time_range_hours', { count: 24 }),
    num: 24,
    seconds: 86400,
    step: 300
  },
  {
    id: '7d',
    label: t('standalone.metrics.time_range_days', { count: 7 }),
    num: 7,
    seconds: 604800,
    step: 1800
  }
]

const DEFAULT_TIME_RANGE = TIME_RANGES[1]!
const selectedTimeRangeId = useStorage<TimeRangeId[]>('metrics_time_range', [DEFAULT_TIME_RANGE.id])
const timeRangeLabel = computed(() => {
  const range = TIME_RANGES.find((r) => r.id == selectedTimeRangeId.value[0])
  return range ? range.label : ''
})
const range = computed(() => {
  const range = TIME_RANGES.find((r) => r.id == selectedTimeRangeId.value[0])
  return range ? range.seconds : DEFAULT_TIME_RANGE.seconds
})
const step = computed(() => {
  const range = TIME_RANGES.find((r) => r.id == selectedTimeRangeId.value[0])
  return range ? range.step : DEFAULT_TIME_RANGE.step
})

// ── Data fetching ─────────────────────────────────────────────────────────────

const { data, isPending, error, dataUpdatedAt } = useQuery({
  queryKey: ['metrics', 'charts', () => range, () => step],
  queryFn: async () => {
    const now = Math.floor(Date.now() / 1000)
    const res = await ubusCall<AxiosResponse<MetricsData>>('ns.telegraf', 'metrics-history', {
      start: now - range.value,
      end: now,
      step: step.value
    })
    return res.data
  },
  refetchInterval: interval,
  refetchOnWindowFocus: interval != false
})

watch(
  dataUpdatedAt,
  (newVal) => {
    emits('updatedAt', newVal)
  },
  { immediate: true }
)

// ── Computed chart data ───────────────────────────────────────────────────────

const cpuChart = computed(() => buildCpuChart(data.value ?? null, themeStore.isLight))
const loadChart = computed(() => buildLoadChart(data.value ?? null, themeStore.isLight))
const diskioChart = computed(() => buildDiskioChart(data.value ?? null, themeStore.isLight))
const diskChart = computed(() => buildDiskChart(data.value ?? null, themeStore.isLight))
const processesChart = computed(() => buildProcessesChart(data.value ?? null, themeStore.isLight))
const memoryChart = computed(() => buildMemoryChart(data.value ?? null, themeStore.isLight))
const packetsChart = computed(() => buildPacketsChart(data.value ?? null, themeStore.isLight))
const connectionsChart = computed(() =>
  buildConnectionsChart(data.value ?? null, themeStore.isLight)
)

const trafficInterfaces = computed(() => getTrafficInterfaces(data.value ?? null))

const latencyQuality = computed(() => getLatencyQuality(data.value ?? null))

// ── Helper methods ────────────────────────────────────────────────────────────

function getInterfaceTrafficChart(iface: string) {
  return buildTrafficChart(iface, data.value ?? null, themeStore.isLight)
}

function getDisplayName(iface: string) {
  return getInterfaceDisplayName(iface, data.value ?? null)
}

function getLatencyCommunityChart(hostData: PingHost) {
  return buildLatencyChart(hostData, themeStore.isLight)
}

function getQualityCommunityChart(hostData: PingHost) {
  return buildQualityChart(hostData, themeStore.isLight)
}
</script>

<template>
  <div>
    <!-- Error notification -->
    <NeInlineNotification
      v-if="error"
      kind="error"
      :title="t('standalone.metrics.cannot_retrieve_metrics')"
      :description="t(getAxiosErrorMessage(error) ?? 'error.generic_error')"
      :close-aria-label="t('common.close')"
    />

    <!-- System Metrics Section -->
    <div v-else class="space-y-4">
      <NeDropdownFilter
        v-model="selectedTimeRangeId"
        :clear-filter-label="t('ne_dropdown_filter.clear_selection')"
        :clear-search-label="t('ne_dropdown_filter.clear_search')"
        :label="timeRangeLabel"
        :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
        :no-options-label="t('ne_dropdown_filter.no_options')"
        :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
        :options="TIME_RANGES"
        kind="radio"
      />
      <div class="grid grid-cols-1 gap-6 xl:grid-cols-2 3xl:grid-cols-3">
        <NeHeading tag="h5" class="col-span-full uppercase">
          {{ t('standalone.metrics.system_section') }}
        </NeHeading>
        <!-- CPU Usage -->
        <MetricChartCard
          :title="t('standalone.metrics.cpu')"
          :chart="cpuChart"
          dataset-suffix="%"
          :show-legend="false"
          :loading="isPending"
        />
        <!-- System Load -->
        <MetricChartCard
          :title="t('standalone.metrics.load')"
          :chart="loadChart"
          :loading="isPending"
        />
        <!-- Disk I/O -->
        <MetricChartCard
          :title="t('standalone.metrics.diskio')"
          :chart="diskioChart"
          :options="byteAxisOptions"
          :loading="isPending"
        />
        <!-- Disk Usage per partition -->
        <MetricChartCard
          :title="t('standalone.metrics.disk')"
          :chart="diskChart"
          dataset-suffix="%"
          :loading="isPending"
        />
        <!-- Total Processes -->
        <MetricChartCard
          :title="t('standalone.metrics.processes')"
          :chart="processesChart"
          :show-legend="false"
          :loading="isPending"
        />
        <!-- RAM Usage -->
        <MetricChartCard
          :title="t('standalone.metrics.memory')"
          :chart="memoryChart"
          dataset-suffix="MB"
          :loading="isPending"
        />
        <NeHeading tag="h5" class="col-span-full uppercase">
          {{ t('standalone.metrics.network_section') }}
        </NeHeading>
        <!-- Network Traffic per interface -->
        <MetricChartCard
          v-for="iface in trafficInterfaces"
          :key="`traffic-${iface}`"
          :title="`${t('standalone.metrics.traffic')} - ${getDisplayName(iface)}`"
          :chart="getInterfaceTrafficChart(iface)"
          use-kbps-format
          :loading="isPending"
        />
        <!-- Network Packets Rx/Tx -->
        <MetricChartCard
          :title="t('standalone.metrics.packets')"
          :chart="packetsChart"
          :loading="isPending"
        />
        <!-- Connections (conntrack) -->
        <MetricChartCard
          :title="t('standalone.metrics.connections')"
          :chart="connectionsChart"
          :show-legend="false"
          :loading="isPending"
        />
        <!-- Latency and quality per ping host -->
        <template v-for="(hostData, host) in latencyQuality" :key="`latency-${host}`">
          <MetricChartCard
            :title="`${t('standalone.metrics.latency')} - ${host}`"
            :chart="getLatencyCommunityChart(hostData as PingHost)"
            :options="latencyOptions"
            :loading="isPending"
          />
          <MetricChartCard
            :title="`${t('standalone.metrics.packet_delivery')} - ${host}`"
            :chart="getQualityCommunityChart(hostData as PingHost)"
            :show-legend="false"
            :options="qualityOptions"
            :loading="isPending"
          />
        </template>
      </div>
    </div>
  </div>
</template>
