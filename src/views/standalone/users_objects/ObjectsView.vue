<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeHeading, NeTabs } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { useTabs } from '@/composables/useTabs'
import HostSets from '@/components/standalone/users_objects/HostSets.vue'
import DomainSets from '@/components/standalone/users_objects/DomainSets.vue'

export type IpVersion = 'ipv4' | 'ipv6'
export type IpVersionFilter = 'any' | 'ipv4' | 'ipv6'

const { t } = useI18n()

const { tabs, selectedTab } = useTabs([
  { name: 'hostSets', label: t('standalone.objects.host_sets') },
  { name: 'domainSets', label: t('standalone.objects.domain_sets') }
])
</script>

<template>
  <div>
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.objects.title') }}</NeHeading>
    <div class="mb-4 max-w-2xl text-gray-500 dark:text-gray-400">
      {{ t('standalone.objects.page_description') }}
    </div>
    <NeTabs
      :tabs="tabs"
      :selected="selectedTab"
      :srTabsLabel="t('ne_tabs.tabs')"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      @selectTab="selectedTab = $event"
      class="mb-8"
    />
    <HostSets v-if="selectedTab === 'hostSets'" />
    <DomainSets v-else-if="selectedTab === 'domainSets'" />
  </div>
</template>
