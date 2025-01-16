<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeHeading, NeInlineNotification, NeTabs } from '@nethesis/vue-components'
import { useTabs } from '@/composables/useTabs'
import BlocklistSourcesPanel from '@/components/standalone/security/threat_shield_dns/BlocklistSourcesPanel.vue'
import FilterBypassPanel from '@/components/standalone/security/threat_shield_dns/FilterBypassPanel.vue'
import SettingsPanel from '@/components/standalone/security/threat_shield_dns/SettingsPanel.vue'
import { onMounted } from 'vue'
import { useThreatShieldStore } from '@/stores/standalone/threatShield'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
// import LocalBlocklistPanel from '@/components/standalone/security/threat_shield_dns/LocalBlocklistPanel.vue'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const tsStore = useThreatShieldStore()

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

onMounted(() => {
  console.log('view mounted') ////

  tsStore.listDnsSettings()
  uciChangesStore.getChanges()
})
</script>

<template>
  <div>
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.threat_shield_dns.title') }}</NeHeading>
    <!-- dns-list-settings error notification -->
    <NeInlineNotification
      v-if="tsStore.errorListDnsSettings"
      kind="error"
      :title="t('error.cannot_retrieve_threat_shield_settings')"
      :description="tsStore.errorListDnsSettings"
      class="mb-5"
    >
      <template #details v-if="tsStore.errorListDnsSettingsDetails">
        {{ tsStore.errorListDnsSettingsDetails }}
      </template>
    </NeInlineNotification>
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
