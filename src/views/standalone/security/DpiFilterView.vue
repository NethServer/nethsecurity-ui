<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeHeading, NeTabs } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import DpiRules from '@/components/standalone/dpi/DpiRules.vue'
import ApplicationGroups from '@/components/standalone/dpi/ApplicationGroups.vue'
import { useTabs } from '@/composables/useTabs'

const { t } = useI18n()
const { tabs, selectedTab } = useTabs([
  { name: 'rules', label: t('standalone.dpi.rules') },
  { name: 'application-groups', label: t('standalone.dpi.application_groups') }
])
</script>

<template>
  <div class="text-sm">
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.dpi.title') }}</NeHeading>
    <NeTabs
      :tabs="tabs"
      :selected="selectedTab"
      :sr-tabs-label="t('ne_tabs.tabs')"
      :sr-select-tab-label="t('ne_tabs.select_a_tab')"
      class="mb-8"
      @select-tab="selectedTab = $event"
    />
    <div>
      <template v-if="selectedTab === 'rules'">
        <DpiRules />
      </template>
      <template v-else-if="selectedTab === 'application-groups'">
        <ApplicationGroups />
      </template>
    </div>
  </div>
</template>
