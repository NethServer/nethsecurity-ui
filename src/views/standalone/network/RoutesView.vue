<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeHeading, NeTabs } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import RoutesContent from '@/components/standalone/routes/RoutesContent.vue'
import { useTabs } from '@/composables/useTabs'

const { t } = useI18n()

// tabs management
const { tabs, selectedTab } = useTabs([
  {
    name: 'routes-ipv4',
    label: t('standalone.routes.tabs.routes_ipv4')
  },
  {
    name: 'routes-ipv6',
    label: t('standalone.routes.tabs.routes_ipv6')
  }
])
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.routes.title') }}</NeHeading>
  <div>
    <NeTabs
      :selected="selectedTab"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      :srTabsLabel="t('ne_tabs.tabs')"
      :tabs="tabs"
      class="mb-8"
      @selectTab="selectedTab = $event"
    />
    <RoutesContent v-if="selectedTab == 'routes-ipv4'" :protocol="'ipv4'" />
    <RoutesContent v-if="selectedTab == 'routes-ipv6'" :protocol="'ipv6'" />
  </div>
</template>
