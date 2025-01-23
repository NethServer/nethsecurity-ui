<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  getAxiosErrorMessage,
  NeButton,
  NeEmptyState,
  NeHeading,
  NeInlineNotification,
  NeTabs
} from '@nethesis/vue-components'
import { useTabs } from '@/composables/useTabs'
import BlocklistSourcesPanel from '@/components/standalone/security/threat_shield_dns/BlocklistSourcesPanel.vue'
import FilterBypassPanel from '@/components/standalone/security/threat_shield_dns/FilterBypassPanel.vue'
import LocalBlocklistPanel from '@/components/standalone/security/threat_shield_dns/LocalBlocklistPanel.vue'
import SettingsPanel from '@/components/standalone/security/threat_shield_dns/SettingsPanel.vue'
import { onMounted, ref } from 'vue'
import { useThreatShieldStore } from '@/stores/standalone/threatShield'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ubusCall } from '@/lib/standalone/ubus'
import { faShield, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const tsStore = useThreatShieldStore()
const router = useRouter()

const { tabs, selectedTab } = useTabs([
  {
    name: 'blocklistSources',
    label: t('standalone.threat_shield_dns.blocklist_sources')
  },
  {
    name: 'filterBypass',
    label: t('standalone.threat_shield_dns.filter_bypass')
  },
  {
    name: 'localBlocklist',
    label: t('standalone.threat_shield_dns.local_blocklist')
  },
  {
    name: 'settings',
    label: t('standalone.threat_shield_dns.settings')
  }
])

const isFlashstartEnabled = ref(false)
const loading = ref({
  getFlashstartConfig: false
})
const error = ref({
  getFlashstartConfig: '',
  getFlashstartConfigDetails: ''
})

onMounted(() => {
  tsStore.listDnsSettings()
  getFlashstartConfig()
  uciChangesStore.getChanges()
})

async function getFlashstartConfig() {
  loading.value.getFlashstartConfig = true

  try {
    const res = await ubusCall('ns.flashstart', 'get-config')
    isFlashstartEnabled.value = res.data?.values?.enabled
  } catch (err: any) {
    error.value.getFlashstartConfig = t(getAxiosErrorMessage(err))
    error.value.getFlashstartConfigDetails = err.toString()
  } finally {
    loading.value.getFlashstartConfig = false
  }
}
</script>

<template>
  <div>
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.threat_shield_dns.title') }}</NeHeading>
    <div class="mb-4 max-w-2xl text-gray-500 dark:text-gray-400">
      {{ t('standalone.threat_shield_dns.page_description') }}
    </div>
    <!-- dns-list-settings error -->
    <NeInlineNotification
      v-if="tsStore.errorListDnsSettings"
      kind="error"
      :title="t('error.cannot_retrieve_threat_shield_settings')"
      :description="tsStore.errorListDnsSettings"
      class="mb-5"
    >
      <template #details v-if="tsStore.errorListDnsSettingsDetails">
        {{ tsStore.errorListDnsSettingsDetails }}
      </template>
    </NeInlineNotification>
    <!-- flashstart dns is enabled -->
    <NeEmptyState
      v-if="isFlashstartEnabled"
      :title="t('standalone.threat_shield_dns.threat_shield_dns_disabled')"
      :description="t('standalone.threat_shield_dns.threat_shield_dns_is_disabled_description')"
      :icon="faShield"
      class="pb-8"
    >
      <NeButton
        kind="primary"
        @click="
          () => {
            router.push(`${getStandaloneRoutePrefix()}/security/flashstart`)
          }
        "
      >
        <template #prefix>
          <font-awesome-icon :icon="faArrowRight" class="h-4 w-4" aria-hidden="true" />
        </template>
        {{ t('common.go_to_page', { page: t('standalone.flashstart.title') }) }}
      </NeButton>
    </NeEmptyState>
    <!-- threat shield dns ui -->
    <template v-else>
      <NeTabs
        :selected="selectedTab"
        :srSelectTabLabel="t('ne_tabs.select_a_tab')"
        :srTabsLabel="t('ne_tabs.tabs')"
        :tabs="tabs"
        class="mb-8"
        @selectTab="selectedTab = $event"
      />
      <BlocklistSourcesPanel v-if="selectedTab === 'blocklistSources'" />
      <FilterBypassPanel v-if="selectedTab === 'filterBypass'" />
      <LocalBlocklistPanel v-if="selectedTab === 'localBlocklist'" />
      <SettingsPanel v-if="selectedTab === 'settings'" />
    </template>
  </div>
</template>
