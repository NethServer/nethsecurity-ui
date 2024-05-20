<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeHeading, NeTabs } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import MultiWanGeneralSettings from '@/components/standalone/multi-wan/MultiWanGeneralSettings.vue'
import MultiWanManager from '@/components/standalone/multi-wan/MultiWanManager.vue'
import { useTabs } from '@/composables/useTabs'

const { t } = useI18n()

const { tabs, selectedTab } = useTabs([
  {
    name: 'multi-wan-manager',
    label: t('standalone.multi_wan.tabs.multi_wan_manager')
  },
  {
    name: 'general-settings',
    label: t('standalone.multi_wan.tabs.general_settings')
  }
])
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.multi_wan.title') }}</NeHeading>
  <div>
    <NeTabs
      :selected="selectedTab"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      :srTabsLabel="t('ne_tabs.tabs')"
      :tabs="tabs"
      class="mb-8"
      @selectTab="selectedTab = $event"
    />
    <MultiWanManager v-if="selectedTab == 'multi-wan-manager'" />
    <MultiWanGeneralSettings v-if="selectedTab == 'general-settings'" />
  </div>
</template>
