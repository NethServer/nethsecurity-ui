<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import NatRulesContent from '@/components/standalone/firewall/nat/NatRulesContent.vue'
import NetmapContent from '@/components/standalone/firewall/nat/NetmapContent.vue'
import NatHelpers from '@/components/standalone/firewall/nat/NatHelpers.vue'
import { useTabs } from '@/composables/useTabs'
import { NeHeading, NeTabs } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { tabs, selectedTab } = useTabs([
  { name: 'nat', label: t('standalone.nat.rules_and_netmap') },
  { name: 'natHelpers', label: t('standalone.nat_helpers.title') }
])
</script>

<template>
  <div>
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.nat.title') }}</NeHeading>
    <NeTabs
      :tabs="tabs"
      :selected="selectedTab"
      :srTabsLabel="t('ne_tabs.tabs')"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      @selectTab="selectedTab = $event"
      class="mb-8"
    />
    <template v-if="selectedTab === 'nat'">
      <!-- nat rules -->
      <NatRulesContent />
      <!-- netmap -->
      <NetmapContent class="mt-12" />
    </template>
    <NatHelpers v-else-if="selectedTab === 'natHelpers'" />
  </div>
</template>
