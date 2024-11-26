<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTrafficSummary } from '@/composables/useTrafficSummary'
import { NeCard, NeEmptyState, NeHeading, byteFormat1024 } from '@nethesis/vue-components'
import TrafficByHourChart from './TrafficByHourChart.vue'
import SimpleStat from '../../charts/SimpleStat.vue'
import BasicPieChart from '@/components/charts/BasicPieChart.vue'

const { t } = useI18n()

const {
  clientsLabels,
  clientsDatasets,
  protocolsLabels,
  protocolsDatasets,
  appsLabels,
  appsDatasets,
  remoteHostsLabels,
  remoteHostsDatasets,
  hoursLabels,
  hoursDatasets,
  totalTraffic,
  loadingTrafficSummary,
  trafficSummaryError,
  trafficSummaryErrorDescription
} = useTrafficSummary()
</script>

<template>
  <div>
    <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-12">
      <!-- total traffic -->
      <NeCard
        :title="t('standalone.real_time_monitor.today_total_traffic')"
        :skeletonLines="2"
        :loading="loadingTrafficSummary"
        :errorTitle="trafficSummaryError"
        :errorDescription="trafficSummaryErrorDescription"
        class="sm:col-span-6 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-3"
      >
        <SimpleStat class="mt-1">
          {{ byteFormat1024(totalTraffic) }}
        </SimpleStat>
      </NeCard>
      <!-- recent traffic -->
      <NeCard
        :title="t('standalone.real_time_monitor.recent_traffic')"
        :loading="loadingTrafficSummary"
        :skeletonLines="6"
        :errorTitle="trafficSummaryError"
        :errorDescription="trafficSummaryErrorDescription"
        class="row-span-2 sm:col-span-12 xl:col-span-9 2xl:col-span-9"
      >
        <TrafficByHourChart :labels="hoursLabels" :datasets="hoursDatasets" height="25vh" />
      </NeCard>

      <!-- today traffic title -->
      <NeHeading tag="h6" class="col-span-full mt-8">
        {{ t('standalone.real_time_monitor.today_traffic') }}
      </NeHeading>

      <!-- top local hosts -->
      <NeCard
        :title="t('standalone.real_time_monitor.today_top_local_hosts')"
        :skeletonLines="6"
        :loading="loadingTrafficSummary"
        :errorTitle="trafficSummaryError"
        :errorDescription="trafficSummaryErrorDescription"
        class="sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-6 2xl:col-span-6 5xl:col-span-3"
      >
        <NeEmptyState
          v-if="!clientsDatasets[0]?.data.length"
          :title="t('common.no_data_available')"
          :icon="['fas', 'chart-line']"
          class="bg-white dark:bg-gray-950"
        />
        <BasicPieChart
          v-else
          :labels="clientsLabels"
          :datasets="clientsDatasets"
          byteFormat
          height="25vh"
        />
      </NeCard>
      <!-- top applications -->
      <NeCard
        :title="t('standalone.real_time_monitor.today_top_applications')"
        :skeletonLines="6"
        :loading="loadingTrafficSummary"
        :errorTitle="trafficSummaryError"
        :errorDescription="trafficSummaryErrorDescription"
        class="sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-6 2xl:col-span-6 5xl:col-span-3"
      >
        <NeEmptyState
          v-if="!appsDatasets[0]?.data.length"
          :title="t('common.no_data_available')"
          :icon="['fas', 'chart-line']"
          class="bg-white dark:bg-gray-950"
        />
        <BasicPieChart
          v-else
          :labels="appsLabels"
          :datasets="appsDatasets"
          byteFormat
          height="25vh"
        />
      </NeCard>
      <!-- top remote hosts -->
      <NeCard
        :title="t('standalone.real_time_monitor.today_top_remote_hosts')"
        :skeletonLines="6"
        :loading="loadingTrafficSummary"
        :errorTitle="trafficSummaryError"
        :errorDescription="trafficSummaryErrorDescription"
        class="sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-6 2xl:col-span-6 5xl:col-span-3"
      >
        <NeEmptyState
          v-if="!remoteHostsDatasets[0]?.data.length"
          :title="t('common.no_data_available')"
          :icon="['fas', 'chart-line']"
          class="bg-white dark:bg-gray-950"
        />
        <BasicPieChart
          v-else
          :labels="remoteHostsLabels"
          :datasets="remoteHostsDatasets"
          byteFormat
          height="25vh"
        />
      </NeCard>
      <!-- top protocols -->
      <NeCard
        :title="t('standalone.real_time_monitor.today_top_protocols')"
        :skeletonLines="6"
        :loading="loadingTrafficSummary"
        :errorTitle="trafficSummaryError"
        :errorDescription="trafficSummaryErrorDescription"
        class="sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-6 2xl:col-span-6 5xl:col-span-3"
      >
        <NeEmptyState
          v-if="!protocolsDatasets[0]?.data.length"
          :title="t('common.no_data_available')"
          :icon="['fas', 'chart-line']"
          class="bg-white dark:bg-gray-950"
        />
        <BasicPieChart
          v-else
          :labels="protocolsLabels"
          :datasets="protocolsDatasets"
          byteFormat
          height="25vh"
        />
      </NeCard>
    </div>
  </div>
</template>
