<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NeCombobox, NeTabs, NeHeading } from '@nethesis/vue-components'
import RefreshProgressBar from '@/components/standalone/monitoring/flows/RefreshProgressBar.vue'
import MetricsChartsSection from '@/components/standalone/monitoring/metrics/MetricsChartsSection.vue'
import MetricsAlertsSection from '@/components/standalone/monitoring/metrics/MetricsAlertsSection.vue'
import { useTabs } from '@/composables/useTabs'
import { useStorage } from '@vueuse/core'

const { t } = useI18n()
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

type RefreshIntervalId = 'off' | '10s' | '30s' | '60s'
type RefreshInterval = {
  id: RefreshIntervalId
  label: string
  ms?: number | false
}

const REFRESH_INTERVALS: RefreshInterval[] = [
  { id: 'off', label: t('standalone.flows.refresh_interval', { value: 'off' }), ms: false },
  { id: '10s', label: t('standalone.flows.refresh_interval', { value: '10s' }), ms: 10000 },
  { id: '30s', label: t('standalone.flows.refresh_interval', { value: '30s' }), ms: 30000 },
  { id: '60s', label: t('standalone.flows.refresh_interval', { value: '60s' }), ms: 60000 }
]

const DEFAULT_REFRESH_INTERVAL = REFRESH_INTERVALS[1]!
const selectedRefreshId = useStorage<RefreshIntervalId>(
  'metrics_refresh_interval',
  DEFAULT_REFRESH_INTERVAL.id
)

const interval = computed(() => {
  return REFRESH_INTERVALS.find((item) => item.id == selectedRefreshId.value)?.ms ?? false
})

const updatedAt = ref<number>(0)

// ── Data fetching ─────────────────────────────────────────────────────────────

const pageDescription = computed(() =>
  selectedTab.value === 'alerts'
    ? t('standalone.metrics.alerts_description')
    : t('standalone.metrics_monitor.description')
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
      <div class="flex flex-col gap-2">
        <NeCombobox
          v-model="selectedRefreshId"
          :options="REFRESH_INTERVALS"
          :label="t('standalone.metrics.refresh_interval')"
          :no-results-label="t('ne_combobox.no_results')"
          :limited-options-label="t('ne_combobox.limited_options_label')"
          :no-options-label="t('ne_combobox.no_options')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input')"
          :optional-label="t('common.optional')"
        />
        <RefreshProgressBar :data-updated-at="updatedAt" :interval="interval" />
      </div>
    </div>

    <MetricsChartsSection
      v-if="selectedTab === 'charts'"
      :interval="interval"
      @updated-at="updatedAt = $event"
    />
    <MetricsAlertsSection v-else :interval="interval" @updated-at="updatedAt = $event" />
  </div>
</template>
