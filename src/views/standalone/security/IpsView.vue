<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeHeading, NeTabs } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { useTabs } from '@/composables/useTabs'
import IpsSettings from '@/components/standalone/security/ips/IpsSettings.vue'
import IpsFilterBypass from '@/components/standalone/security/ips/IpsFilterBypass.vue'
import IpsDisabledRules from '@/components/standalone/security/ips/IpsDisabledRules.vue'
import IpsSuppressedAlerts from '@/components/standalone/security/ips/IpsSuppressedAlerts.vue'
import IpsEventList from '@/components/standalone/security/ips/IpsEventList.vue'

const { t } = useI18n()
const { tabs, selectedTab } = useTabs([
  { name: 'event_list', label: t('standalone.ips.event_list_tab') },
  { name: 'filter_bypass', label: t('standalone.ips.filter_bypass_tab') },
  { name: 'disabled_rules', label: t('standalone.ips.disabled_rules_tab') },
  { name: 'suppressed_alerts', label: t('standalone.ips.suppressed_alerts_tab') },
  { name: 'settings', label: t('standalone.ips.settings_tab') }
])
</script>

<template>
  <div class="space-y-8">
    <NeHeading tag="h3">{{ t('standalone.ips.title') }}</NeHeading>
    <NeTabs
      :selected="selectedTab"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      :srTabsLabel="t('ne_tabs.tabs')"
      :tabs="tabs"
      @selectTab="selectedTab = $event"
    />
    <IpsEventList v-if="selectedTab == 'event_list'" />
    <IpsFilterBypass v-if="selectedTab == 'filter_bypass'" />
    <IpsDisabledRules v-if="selectedTab == 'disabled_rules'" />
    <IpsSuppressedAlerts v-if="selectedTab == 'suppressed_alerts'" />
    <IpsSettings v-if="selectedTab == 'settings'" />
  </div>
</template>
