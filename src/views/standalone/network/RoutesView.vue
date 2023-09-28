<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeTabs, NeTitle } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RoutesManager from '@/components/standalone/routes/RoutesManager.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// tabs management
const tabs = ref([
  {
    name: 'routes-ipv4',
    label: t('standalone.routes.tabs.routes_ipv4')
  },
  {
    name: 'routes-ipv6',
    label: t('standalone.routes.tabs.routes_ipv6')
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
  <div>
    <NeTabs
      :selected="selectedTab"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      :srTabsLabel="t('ne_tabs.tabs')"
      :tabs="tabs"
      class="mb-8"
      @selectTab="selectedTab = $event"
    />
    <RoutesManager v-if="selectedTab == 'routes-ipv4'" :protocol="'ipv4'" />
    <RoutesManager v-if="selectedTab == 'routes-ipv6'" :protocol="'ipv6'" />
  </div>
</template>
