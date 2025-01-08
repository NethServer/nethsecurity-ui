<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeHeading, NeTabs } from '@nethesis/vue-components'
import { useTabs } from '@/composables/useTabs'
import BlocklistSourcesPanel from '@/components/standalone/security/threat_shield_dns/BlocklistSourcesPanel.vue'
import FilterBypassPanel from '@/components/standalone/security/threat_shield_dns/FilterBypassPanel.vue' ////
import SettingsPanel from '@/components/standalone/security/threat_shield_dns/SettingsPanel.vue'
// import LocalBlocklistPanel from '@/components/standalone/security/threat_shield_dns/LocalBlocklistPanel.vue'

const { t } = useI18n()

const { tabs, selectedTab } = useTabs([
  {
    name: 'blocklistSources',
    label: t('standalone.threat_shield_dns.blocklist_sources')
  },
  {
    name: 'filterBypass',
    label: t('standalone.threat_shield_dns.filter_bypass')
  },
  {
    name: 'localBlocklist',
    label: t('standalone.threat_shield_dns.local_blocklist')
  },
  {
    name: 'settings',
    label: t('standalone.threat_shield_dns.settings')
  }
])
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.threat_shield_dns.title') }}</NeHeading>
  <div>
    <NeTabs
      :selected="selectedTab"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      :srTabsLabel="t('ne_tabs.tabs')"
      :tabs="tabs"
      class="mb-8"
      @selectTab="selectedTab = $event"
    />
    <BlocklistSourcesPanel v-if="selectedTab === 'blocklistSources'" />
    <FilterBypassPanel v-if="selectedTab === 'filterBypass'" />
    <!-- <LocalBlocklistPanel v-if="selectedTab === 'localBlocklist'" /> //// -->
    <SettingsPanel v-if="selectedTab === 'settings'" />
  </div>
</template>
