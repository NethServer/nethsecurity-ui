<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeCard } from '@nethesis/vue-components'
import { toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import MetricChartCard from './MetricChartCard.vue'
import { useMetricsCharts, type MetricsData, type PingHost } from '@/composables/useMetricsCharts'

const props = defineProps<{
  metrics: MetricsData | null
  loading: boolean
}>()

const { t } = useI18n()

const {
  trafficInterfaces,
  getInterfaceDisplayName,
  getInterfaceTrafficChart,
  packetsChart,
  connectionsChart,
  latencyQuality,
  getLatencyChart,
  getQualityChart,
  latencyOptions,
  qualityOptions
} = useMetricsCharts(toRef(props, 'metrics'))
</script>

<template>
  <div>
    <h4 class="mb-4 text-sm font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300">
      {{ t('standalone.metrics.network_section') }}
    </h4>
    <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-12">
      <!-- skeleton -->
      <template v-if="loading">
        <NeCard
          v-for="i in 4"
          :key="i"
          loading
          :skeleton-lines="6"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4"
        />
      </template>
      <template v-else>
        <!-- Network Traffic per interface -->
        <MetricChartCard
          v-for="iface in trafficInterfaces"
          :key="`traffic-${iface}`"
          :title="`${t('standalone.metrics.traffic')} - ${getInterfaceDisplayName(iface)}`"
          :chart="getInterfaceTrafficChart(iface)"
          use-kbps-format
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4"
        />
        <!-- Network Packets Rx/Tx -->
        <MetricChartCard
          :title="t('standalone.metrics.packets')"
          :chart="packetsChart"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4"
        />
        <!-- Connections (conntrack) -->
        <MetricChartCard
          :title="t('standalone.metrics.connections')"
          :chart="connectionsChart"
          :show-legend="false"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4"
        />
        <!-- Latency and quality per ping host -->
        <template v-for="(hostData, host) in latencyQuality" :key="`latency-${host}`">
          <MetricChartCard
            :title="`${t('standalone.metrics.latency')} - ${host}`"
            :chart="getLatencyChart(hostData as PingHost)"
            :options="latencyOptions"
            class="sm:col-span-12 xl:col-span-6 3xl:col-span-4"
          />
          <MetricChartCard
            :title="`${t('standalone.metrics.packet_delivery')} - ${host}`"
            :chart="getQualityChart(hostData as PingHost)"
            :show-legend="false"
            :options="qualityOptions"
            class="sm:col-span-12 xl:col-span-6 3xl:col-span-4"
          />
        </template>
      </template>
    </div>
  </div>
</template>
