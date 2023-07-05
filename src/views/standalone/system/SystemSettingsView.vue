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
import TimeSynchronization from '@/components/standalone/system_settings/TimeSynchronization.vue'

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
      :srTabsLabel="t('ne_tabs.tabs')"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      @selectTab="changeTab"
      class="mb-8"
    />
    <div class="px-8">
      <template v-if="currentTab === 'general'">
        <GeneralSettings />
      </template>
      <template v-else-if="currentTab === 'logs'"> Logs </template>
      <template v-else-if="currentTab === 'timeSync'">
        <TimeSynchronization />
      </template>
    </div>
  </div>
</template>
