<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeButton, NeInlineNotification, NeTabs, NeTitle } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainActiveRoutesTable from '@/components/standalone/routes/MainActiveRoutesTable.vue'
import Ipv4RoutesTable from '@/components/standalone/routes/Ipv4RoutesTable.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// tabs management
const tabs = ref([
  {
    name: 'ipv4-routes',
    label: t('standalone.routes.ipv4_routes')
  },
  {
    name: 'ipv6-routes',
    label: t('standalone.routes.ipv6_routes')
  }
])
const selectedTab = ref('')

onMounted(() => {
  selectedTab.value = (route.query.tab as string) ?? tabs.value[0].name
})

watch(selectedTab, () => {
  router.push({ path: route.path, query: { tab: selectedTab.value } })
})
</script>

<template>
  <NeTitle>{{ t('standalone.routes.title') }}</NeTitle>
  <NeInlineNotification :kind="'warning'" title="This page is a WIP." />
  <NeTabs
    :selected="selectedTab"
    :srSelectTabLabel="t('ne_tabs.select_a_tab')"
    :srTabsLabel="t('ne_tabs.tabs')"
    :tabs="tabs"
    @selectTab="selectedTab = $event"
  />
  <div class="mt-8 mb-8">
    <div class="mb-8 sm:flex sm:mb-0">
      <p class="text-sm text-gray-400 mb-8 sm:max-w-md">
        {{ t('standalone.routes.description') }}
      </p>
      <NeButton class="w-full sm:w-auto sm:self-start sm:ml-auto" kind="primary" size="lg">
        {{ t('standalone.routes.add_route') }}
      </NeButton>
    </div>
    <a class="text-sm font-semibold text-primary-500" href="#section">
      {{ t('standalone.routes.main_table_active_routes') }}
    </a>
  </div>
  <template v-if="selectedTab === 'ipv4-routes'">
    <Ipv4RoutesTable class="mb-8" />
    <MainActiveRoutesTable />
  </template>
</template>
