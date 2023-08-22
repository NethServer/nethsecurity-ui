<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeTabs, NeTitle } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MultiWanGeneralSettings from '@/components/standalone/multi-wan/MultiWanGeneralSettings.vue'
import MultiWanManager from '@/components/standalone/multi-wan/MultiWanManager.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// tabs management
const tabs = ref([
  {
    name: 'multi-wan-manager',
    label: t('standalone.multi_wan.tabs.multi_wan_manager')
  },
  {
    name: 'general-settings',
    label: t('standalone.multi_wan.tabs.general_settings')
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
  <NeTitle>{{ t('standalone.multi_wan.title') }}</NeTitle>
  <div>
    <NeTabs
      :selected="selectedTab"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      :srTabsLabel="t('ne_tabs.tabs')"
      :tabs="tabs"
      class="mb-8"
      @selectTab="selectedTab = $event"
    />
    <MultiWanManager v-if="selectedTab == 'multi-wan-manager'" />
    <MultiWanGeneralSettings v-if="selectedTab == 'general-settings'" />
  </div>
</template>
