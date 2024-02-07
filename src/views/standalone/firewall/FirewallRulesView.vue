<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeTitle } from '@nethesis/vue-components'
import { NeTabs } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { useTabs } from '@/composables/useTabs'
import FirewallRulesContent from '@/components/standalone/firewall/rules/FirewallRulesContent.vue'
import { computed } from 'vue'

const { t } = useI18n()

const { tabs, selectedTab } = useTabs([
  { name: 'forwardRules', label: t('standalone.firewall_rules.forward_rules') },
  { name: 'inputRules', label: t('standalone.firewall_rules.input_rules') },
  { name: 'outputRules', label: t('standalone.firewall_rules.output_rules') }
])

const rulesType = computed(() => {
  switch (selectedTab.value) {
    case 'forwardRules':
      return 'forward'
    case 'inputRules':
      return 'input'
    default:
      return 'output'
  }
})
</script>

<template>
  <div class="text-sm">
    <NeTitle>{{ t('standalone.firewall_rules.title') }}</NeTitle>
    <NeTabs
      :tabs="tabs"
      :selected="selectedTab"
      :srTabsLabel="t('ne_tabs.tabs')"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      @selectTab="selectedTab = $event"
      class="mb-8"
    />
    <FirewallRulesContent :rulesType="rulesType" />
  </div>
</template>
