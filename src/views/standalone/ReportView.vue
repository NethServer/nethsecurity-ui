<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeHeading, NeTabs } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ReportContent from '@/components/standalone/report/ReportContent.vue'
import PingContent from '@/components/standalone/report/PingContent.vue'
import { useTabs } from '@/composables/useTabs'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { tabs, selectedTab } = useTabs([
  {
    name: 'tab-report',
    label: t('standalone.report.tabs.real_time_report')
  },
  {
    name: 'tab-ping',
    label: t('standalone.report.tabs.ping_latency_monitor')
  }
])

onMounted(() => {
  selectedTab.value = (route.query.tab as string) ?? tabs.value[0].name
})

watch(selectedTab, () => {
  router.push({ path: route.path, query: { tab: selectedTab.value } })
})
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.report.title') }}</NeHeading>
  <div class="flex flex-col gap-y-6">
    <NeTabs
      :selected="selectedTab"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      :srTabsLabel="t('ne_tabs.tabs')"
      :tabs="tabs"
      class="mb-8"
      @selectTab="selectedTab = $event"
    />
    <ReportContent v-if="selectedTab == 'tab-report'" />
    <PingContent v-if="selectedTab == 'tab-ping'" />
  </div>
</template>
