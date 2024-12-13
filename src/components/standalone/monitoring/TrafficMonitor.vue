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
import { computed, watchEffect } from 'vue'
import { CYAN_500, CYAN_600 } from '@/lib/color'
import { useThemeStore } from '@/stores/theme'
import { useTrafficStats } from '@/composables/useTrafficStats'
import TrafficCard from '@/components/standalone/monitoring/TrafficCard.vue'
import { faEmptySet } from '@nethesis/nethesis-solid-svg-icons'
import { type AvailableFilters, useTrafficFilter } from '@/composables/useTrafficFilter'
import NeBreadcrumbs, { type BreadcrumbItem } from '@/components/NeBreadcrumbs.vue'

type FilterableBreadcrumbItem = BreadcrumbItem & {
  key: string
}

const themeStore = useThemeStore()
const { get, list, remove, misses, contains } = useTrafficFilter()
const { data, error, loading, loadData } = useTrafficStats()

watchEffect(() => {
  loadData(get('client'), get('app'), get('protocol'), get('host'))
})

const { t } = useI18n()

const filtersToBreadcrumb = computed<FilterableBreadcrumbItem[]>(() => {
  let order = 1
  // add a default item to the breadcrumb
  const defaultItem: FilterableBreadcrumbItem = {
    key: 'default',
    order: order++,
    label: t('standalone.real_time_monitor.traffic')
  }
  return list.value
    .map((filter) => {
      let label = ''
      switch (filter.key) {
        case 'app':
          if (filter.value.startsWith('netify.')) {
            label = filter.value.slice(7)
          } else {
            label = filter.value
          }
          if (label == 'unknown') {
            label = t('common.unknown')
          } else {
            label = label.charAt(0).toUpperCase() + label.slice(1)
          }
          break
        case 'client':
          label = filter.value
          break
        case 'host':
          label = filter.value
          break
        case 'protocol':
          label = filter.value.toUpperCase()
          break
        default:
          label = t(`standalone.real_time_monitor.${filter.key}`)
      }
      return {
        key: filter.key as string,
        order: order++,
        label: label
      }
    })
    .concat(defaultItem)
})

function handleBreadcrumbClick(item: BreadcrumbItem) {
  remove(
    filtersToBreadcrumb.value
      .filter((breadcrumbItem) => breadcrumbItem.order > item.order)
      .map((breadcrumbItem) => breadcrumbItem.key) as AvailableFilters[]
  )
}

const resolvedHostname = computed(
  (): string | undefined =>
    data.value.clients.find((client) => client.id == get('client'))?.label ?? undefined
)

const applicationName = computed(
  (): string | undefined =>
    data.value.applications?.find((app) => app.id == get('app'))?.label ?? undefined
)

const hoursLabels = computed(() => {
  return data.value.hourly_traffic.map((value) => value.id)
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
      data: data.value.hourly_traffic.map((value) => value.traffic)
    }
  ]
})
</script>

<template>
  <div class="space-y-6">
    <NeBreadcrumbs
      v-if="filtersToBreadcrumb.length > 1"
      :items="filtersToBreadcrumb"
      @click="handleBreadcrumbClick"
    />
    <NeSkeleton v-if="loading" :lines="10" />
    <NeInlineNotification
      v-else-if="error"
      :description="t(getAxiosErrorMessage(error.message))"
      :title="t('standalone.real_time_monitor.error_fetching_data')"
      kind="error"
    />
    <template v-else>
      <div class="flex flex-col gap-6 xl:flex-row">
        <div class="flex flex-col gap-6 sm:w-96">
          <NeCard v-if="contains('client')" :title="t('standalone.dashboard.hostname')">
            <SimpleStat>
              <p v-if="resolvedHostname != get('client')" class="text-lg">
                {{ resolvedHostname }}
              </p>
              <p class="text-lg [&:nth-child(2)]:text-base">{{ get('client') }}</p>
            </SimpleStat>
          </NeCard>
          <NeCard v-if="applicationName" :title="t('standalone.real_time_monitor.application')">
            <SimpleStat> {{ applicationName }}</SimpleStat>
          </NeCard>
          <NeCard v-if="contains('protocol')" :title="t('standalone.real_time_monitor.protocol')">
            <SimpleStat> {{ get('protocol').toUpperCase() }}</SimpleStat>
          </NeCard>
          <NeCard v-if="contains('host')" :title="t('standalone.real_time_monitor.remote_hosts')">
            <SimpleStat>
              <p class="text-lg">{{ get('host') }}</p>
            </SimpleStat>
          </NeCard>
          <NeCard :title="t('standalone.real_time_monitor.daily_total_traffic')">
            <SimpleStat>
              <span v-if="data.total_traffic != 0">{{ byteFormat1024(data.total_traffic) }}</span>
              <span v-else> - </span>
            </SimpleStat>
          </NeCard>
        </div>
        <NeCard :title="t('standalone.real_time_monitor.recent_traffic')" class="flex-1 self-start">
          <TrafficByHourChart
            v-if="data.hourly_traffic.length > 0"
            :datasets="hoursDatasets"
            :labels="hoursLabels"
            height="25vh"
          />
          <NeEmptyState
            v-else
            :icon="faEmptySet"
            :title="t('standalone.real_time_monitor.no_data_available')"
          />
        </NeCard>
      </div>
      <div class="grid gap-6 xl:grid-cols-2">
        <TrafficCard
          v-if="misses('client')"
          :data="data.clients"
          :title="t('standalone.real_time_monitor.local_hosts')"
          filterable
          filterable-key="client"
        />
        <TrafficCard
          v-if="misses('app')"
          :data="data.applications"
          :title="t('standalone.real_time_monitor.applications')"
          filterable
          filterable-key="app"
        />
        <TrafficCard
          v-if="misses('host')"
          :data="data.remote_hosts"
          :title="t('standalone.real_time_monitor.remote_hosts')"
          filterable
          filterable-key="host"
        />
        <TrafficCard
          v-if="misses('protocol')"
          :data="data.protocols"
          :title="t('standalone.real_time_monitor.protocols')"
          filterable
          filterable-key="protocol"
        />
      </div>
    </template>
  </div>
</template>
