<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeTitle, NeTabs } from '@nethserver/vue-tailwind-lib'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import GeneralSettings from '@/components/standalone/system_settings/GeneralSettings.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const tabs = ref([
  { name: 'general', label: t('standalone.system_settings.general_settings') },
  { name: 'logs', label: t('standalone.system_settings.logs_settings') },
  { name: 'timeSync', label: t('standalone.system_settings.time_synchronization') }
])

let currentTab = ref('')
let initiallySelectedTab = ref('')

onMounted(() => {
  const tab = route.query.tab as string

  if (!tab) {
    initiallySelectedTab.value = 'general'
  } else {
    initiallySelectedTab.value = tab
  }
})

function changeTab(tabName: any) {
  currentTab.value = tabName
  router.push({ path: route.path, query: { tab: currentTab.value } })
}
</script>

<template>
  <div>
    <NeTitle>{{ t('standalone.system_settings.title') }}</NeTitle>
    <NeTabs
      :tabs="tabs"
      :selected="initiallySelectedTab"
      :srTabsLabel="t('common.tabs')"
      :srSelectTabLabel="t('common.select_a_tab')"
      @selectTab="changeTab"
    />
    <template v-if="currentTab === 'general'">
      <GeneralSettings />
    </template>
    <template v-else-if="currentTab === 'logs'"> Logs </template>
    <template v-else-if="currentTab === 'timeSync'"> TimeSync </template>
  </div>
</template>
