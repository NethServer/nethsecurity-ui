<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeTitle, NeTabs } from '@nethesis/vue-components'
import { useTabs } from '@/composables/useTabs'
import AllowlistTab from '@/components/standalone/security/threat_shield/AllowlistTab.vue'
import BlocklistTab from '@/components/standalone/security/threat_shield/BlocklistTab.vue'
import SettingsTab from '@/components/standalone/security/threat_shield/SettingsTab.vue'

const { t } = useI18n()

const { tabs, selectedTab } = useTabs([
  {
    name: 'blocklist',
    label: t('standalone.threat_shield.blocklist')
  },
  {
    name: 'allowlist',
    label: t('standalone.threat_shield.allowlist')
  },
  {
    name: 'settings',
    label: t('standalone.threat_shield.settings')
  }
])
</script>

<template>
  <NeTitle>{{ t('standalone.threat_shield.title') }}</NeTitle>
  <div>
    <NeTabs
      :selected="selectedTab"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      :srTabsLabel="t('ne_tabs.tabs')"
      :tabs="tabs"
      class="mb-8"
      @selectTab="selectedTab = $event"
    />
    <BlocklistTab v-if="selectedTab === 'blocklist'" />
    <AllowlistTab v-if="selectedTab === 'allowlist'" />
    <SettingsTab v-if="selectedTab === 'settings'" />
  </div>
</template>
