<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeHeading, NeTabs } from '@nethesis/vue-components'
import { useTabs } from '@/composables/useTabs'
import AllowlistTab from '@/components/standalone/security/threat_shield/AllowlistTab.vue'
import BlocklistTab from '@/components/standalone/security/threat_shield/BlocklistTab.vue'
import SettingsTab from '@/components/standalone/security/threat_shield/SettingsTab.vue'
import LocalBlocklistTab from '@/components/standalone/security/threat_shield/LocalBlocklistTab.vue'
import BannedIpsTab from '@/components/standalone/security/threat_shield/BannedIpsTab.vue'

export type BanIpLocalAddress = {
  address: string
  description: string
}

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
    name: 'localBlocklist',
    label: t('standalone.threat_shield.local_blocklist')
  },
  {
    name: 'bannedIps',
    label: t('standalone.threat_shield.banned_ips')
  },
  {
    name: 'settings',
    label: t('standalone.threat_shield.settings')
  }
])
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.threat_shield.title') }}</NeHeading>
  <div>
    <NeTabs
      :selected="selectedTab"
      :sr-select-tab-label="t('ne_tabs.select_a_tab')"
      :sr-tabs-label="t('ne_tabs.tabs')"
      :tabs="tabs"
      class="mb-8"
      @select-tab="selectedTab = $event"
    />
    <BlocklistTab v-if="selectedTab === 'blocklist'" />
    <AllowlistTab v-if="selectedTab === 'allowlist'" />
    <LocalBlocklistTab v-if="selectedTab === 'localBlocklist'" />
    <BannedIpsTab v-if="selectedTab === 'bannedIps'" />
    <SettingsTab v-if="selectedTab === 'settings'" />
  </div>
</template>
