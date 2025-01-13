<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeHeading,
  NeInlineNotification,
  NeSkeleton,
  NeTabs
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { useTabs } from '@/composables/useTabs'
import IpsSettings from '@/components/standalone/security/ips/IpsSettings.vue'
import { useIpsStore } from '@/stores/standalone/ips'
import IpsFilterBypass from '@/components/standalone/security/ips/IpsFilterBypass.vue'

const { t } = useI18n()
const { tabs, selectedTab } = useTabs([
  { name: 'event_list', label: t('standalone.ips.event_list_tab') },
  { name: 'filter_bypass', label: t('standalone.ips.filter_bypass_tab') },
  { name: 'disabled_rules', label: t('standalone.ips.disabled_rules_tab') },
  { name: 'suppressed_alerts', label: t('standalone.ips.suppressed_alerts_tab') },
  { name: 'settings', label: t('standalone.ips.settings_tab') }
])
const ips = useIpsStore()
</script>

<template>
  <div class="space-y-8">
    <NeHeading>{{ t('standalone.ips.title') }}</NeHeading>
    <NeTabs
      :selected="selectedTab"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      :srTabsLabel="t('ne_tabs.tabs')"
      :tabs="tabs"
      @selectTab="selectedTab = $event"
    />
    <NeSkeleton v-if="ips.loading" :lines="10" />
    <template v-else>
      <NeInlineNotification
        v-if="ips.error"
        :description="t(getAxiosErrorMessage(ips.error))"
        :title="t('standalone.ips.failed_to_fetch_info')"
        kind="error"
      />
      <IpsFilterBypass v-if="selectedTab == 'filter_bypass'" />
      <!--      <IpsDisabled v-if="!ips.enabled" />-->
      <IpsSettings v-if="selectedTab == 'settings'" />
    </template>
  </div>
</template>
