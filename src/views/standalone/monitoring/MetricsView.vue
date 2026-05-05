<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeCombobox,
  type NeComboboxOption,
  NeInlineNotification,
  NeTabs,
  getAxiosErrorMessage,
  getPreference,
  NeHeading,
  savePreference
} from '@nethesis/vue-components'
import RefreshProgressBar from '@/components/standalone/monitoring/flows/RefreshProgressBar.vue'
import { useQuery } from '@tanstack/vue-query'
import type { MetricsData } from '@/composables/useMetricsCharts'
import SystemMetricsSection from '@/components/standalone/monitoring/metrics/SystemMetricsSection.vue'
import NetworkMetricsSection from '@/components/standalone/monitoring/metrics/NetworkMetricsSection.vue'
import MetricsAlertsSection from '@/components/standalone/monitoring/metrics/MetricsAlertsSection.vue'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { useTabs } from '@/composables/useTabs'

const { t } = useI18n()
const loginStore = useLoginStore()
const alertsDataUpdatedAt = ref(0)
const { tabs, selectedTab } = useTabs([
  {
    name: 'charts',
    label: t('standalone.metrics.tabs.charts')
  },
  {
    name: 'alerts',
    label: t('standalone.metrics.tabs.alerts')
  }
])

// ── Time range and refresh options ────────────────────────────────────────────

const METRICS_TIME_RANGE_KEY = 'metrics_time_range'
const METRICS_REFRESH_INTERVAL_KEY = 'metrics_refresh_interval'

type TimeRangeId = '5m' | '30m' | '1h' | '12h' | '24h' | '7d'
type RefreshIntervalId = 'off' | '30s' | '60s'

const TIME_RANGES = [
  { id: '5m', labelKey: 'standalone.metrics.time_range_minutes', num: 5, seconds: 300, step: 5 },
  {
    id: '30m',
    labelKey: 'standalone.metrics.time_range_minutes',
    num: 30,
    seconds: 1800,
    step: 30
  },
  { id: '1h', labelKey: 'standalone.metrics.time_range_hours', num: 1, seconds: 3600, step: 60 },
  {
    id: '12h',
    labelKey: 'standalone.metrics.time_range_hours',
    num: 12,
    seconds: 43200,
    step: 300
  },
  {
    id: '24h',
    labelKey: 'standalone.metrics.time_range_hours',
    num: 24,
    seconds: 86400,
    step: 300
  },
  { id: '7d', labelKey: 'standalone.metrics.time_range_days', num: 7, seconds: 604800, step: 1800 }
] as const

const REFRESH_INTERVALS = [
  { id: 'off', labelKey: 'standalone.metrics.refresh_off' },
  { id: '30s', labelKey: 'standalone.metrics.refresh_30s', ms: 30000 },
  { id: '60s', labelKey: 'standalone.metrics.refresh_60s', ms: 60000 }
] as const

const DEFAULT_TIME_RANGE = TIME_RANGES[1]
const DEFAULT_REFRESH_INTERVAL = REFRESH_INTERVALS[1]

function isTimeRangeId(value: unknown): value is TimeRangeId {
  return typeof value === 'string' && TIME_RANGES.some((range) => range.id === value)
}

function isRefreshIntervalId(value: unknown): value is RefreshIntervalId {
  return typeof value === 'string' && REFRESH_INTERVALS.some((interval) => interval.id === value)
}

function readPreference<T extends string>(
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T
): T {
  if (!loginStore.username) {
    return fallback
  }

  const storedValue = getPreference(key, loginStore.username)
  if (isValid(storedValue)) {
    return storedValue
  }

  savePreference(key, fallback, loginStore.username)
  return fallback
}

const selectedTimeRangeId = ref<TimeRangeId>(DEFAULT_TIME_RANGE.id)
const selectedRefreshId = ref<RefreshIntervalId>(DEFAULT_REFRESH_INTERVAL.id)

const timeRangeOptions = computed<NeComboboxOption[]>(() =>
  TIME_RANGES.map((range) => ({
    id: range.id,
    label: t(range.labelKey, { num: range.num })
  }))
)

const refreshIntervalOptions = computed<NeComboboxOption[]>(() =>
  REFRESH_INTERVALS.map((interval) => ({
    id: interval.id,
    label: t(interval.labelKey)
  }))
)

watch(
  () => loginStore.username,
  (username) => {
    if (!username) {
      return
    }

    selectedTimeRangeId.value = readPreference(
      METRICS_TIME_RANGE_KEY,
      isTimeRangeId,
      DEFAULT_TIME_RANGE.id
    )
    selectedRefreshId.value = readPreference(
      METRICS_REFRESH_INTERVAL_KEY,
      isRefreshIntervalId,
      DEFAULT_REFRESH_INTERVAL.id
    )
  },
  { immediate: true }
)

watch(selectedTimeRangeId, (id) => {
  if (loginStore.username) {
    savePreference(METRICS_TIME_RANGE_KEY, id, loginStore.username)
  }
})

watch(selectedRefreshId, (id) => {
  if (loginStore.username) {
    savePreference(METRICS_REFRESH_INTERVAL_KEY, id, loginStore.username)
  }
})

// ── Data fetching ─────────────────────────────────────────────────────────────

const computedRefetchInterval = computed<number | false>(() => {
  const interval =
    REFRESH_INTERVALS.find((candidate) => candidate.id === selectedRefreshId.value) ??
    DEFAULT_REFRESH_INTERVAL
  return 'ms' in interval ? interval.ms : false
})

function handleAlertsUpdatedAt(value: number) {
  alertsDataUpdatedAt.value = value
}

const pageDescription = computed(() =>
  selectedTab.value === 'alerts'
    ? t('standalone.metrics.alerts_description')
    : t('standalone.metrics_monitor.description')
)

const { data, isPending, isError, error, dataUpdatedAt } = useQuery({
  queryKey: ['metrics-history', selectedTimeRangeId, selectedRefreshId],
  queryFn: async () => {
    const range =
      TIME_RANGES.find((candidate) => candidate.id === selectedTimeRangeId.value) ??
      DEFAULT_TIME_RANGE
    const now = Math.floor(Date.now() / 1000)
    const res = await ubusCall('ns.telegraf', 'metrics-history', {
      start: now - range.seconds,
      end: now,
      step: range.step
    })
    return res.data as MetricsData
  },
  refetchInterval: computedRefetchInterval,
  refetchOnWindowFocus: false,
  enabled: computed(() => Boolean(loginStore.username) && selectedTab.value === 'charts')
})

const activeDataUpdatedAt = computed(() =>
  selectedTab.value === 'alerts' ? alertsDataUpdatedAt.value : (dataUpdatedAt.value ?? 0)
)
</script>

<template>
  <div class="space-y-8">
    <!-- Heading -->
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.metrics.title') }}</NeHeading>

    <NeTabs
      :selected="selectedTab"
      :sr-select-tab-label="t('ne_tabs.select_a_tab')"
      :sr-tabs-label="t('ne_tabs.tabs')"
      :tabs="tabs"
      @select-tab="selectedTab = $event"
    />

    <!-- Controls -->
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <p class="max-w-xl text-sm text-gray-500 dark:text-gray-400">
        {{ pageDescription }}
      </p>
      <div class="flex flex-wrap items-start gap-4">
        <div v-if="selectedTab === 'charts'" class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t('standalone.metrics.time_range') }}
          </label>
          <NeCombobox
            v-model="selectedTimeRangeId"
            :options="timeRangeOptions"
            :no-results-label="t('ne_combobox.no_results')"
            :limited-options-label="t('ne_combobox.limited_options_label')"
            :no-options-label="t('ne_combobox.no_options')"
            selected-label="label"
            user-input-label="label"
            optional-label=""
          />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t('standalone.metrics.refresh_interval') }}
          </label>
          <NeCombobox
            v-model="selectedRefreshId"
            :options="refreshIntervalOptions"
            :no-results-label="t('ne_combobox.no_results')"
            :limited-options-label="t('ne_combobox.limited_options_label')"
            :no-options-label="t('ne_combobox.no_options')"
            selected-label="label"
            user-input-label="label"
            optional-label=""
          />
          <RefreshProgressBar
            :data-updated-at="activeDataUpdatedAt"
            :interval="computedRefetchInterval"
          />
        </div>
      </div>
    </div>

    <!-- Error notification -->
    <NeInlineNotification
      v-if="selectedTab === 'charts' && isError"
      kind="error"
      :title="t('standalone.metrics.cannot_retrieve_metrics')"
      :description="t(getAxiosErrorMessage(error) ?? 'error.generic_error')"
      :close-aria-label="t('common.close')"
    />

    <template v-if="selectedTab === 'charts'">
      <!-- System section -->
      <SystemMetricsSection :metrics="data ?? null" :loading="isPending" />

      <!-- Network section -->
      <NetworkMetricsSection :metrics="data ?? null" :loading="isPending" />
    </template>

    <MetricsAlertsSection
      v-else
      :refresh-interval="computedRefetchInterval"
      @updated-at="handleAlertsUpdatedAt"
    />
  </div>
</template>
