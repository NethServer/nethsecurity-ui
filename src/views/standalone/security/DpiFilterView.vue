<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeTitle, NeTabs } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import DpiRules from '@/components/standalone/dpi/DpiRules.vue'
import DpiExceptions from '@/components/standalone/dpi/DpiExceptions.vue'
import { useTabs } from '@/composables/useTabs'

const { t } = useI18n()
const { tabs, selectedTab } = useTabs([
  { name: 'rules', label: t('standalone.dpi.rules') },
  { name: 'exceptions', label: t('standalone.dpi.exceptions') }
])
</script>

<template>
  <div class="text-sm">
    <NeTitle>{{ t('standalone.dpi.title') }}</NeTitle>
    <NeTabs
      :tabs="tabs"
      :selected="selectedTab"
      :srTabsLabel="t('ne_tabs.tabs')"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      @selectTab="selectedTab = $event"
      class="mb-8"
    />
    <div>
      <template v-if="selectedTab === 'rules'">
        <DpiRules />
      </template>
      <template v-else-if="selectedTab === 'exceptions'">
        <DpiExceptions />
      </template>
    </div>
  </div>
</template>
