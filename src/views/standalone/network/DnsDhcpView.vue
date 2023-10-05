<script setup lang="ts">
import { NeTitle, NeTabs } from '@nethserver/vue-tailwind-lib'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import DhcpManager from '@/components/standalone/dns_dhcp/DhcpManager.vue'
import StaticLeases from '@/components/standalone/dns_dhcp/StaticLeases.vue'
import DynamicLeases from '@/components/standalone/dns_dhcp/DynamicLeases.vue'
import DnsManager from '@/components/standalone/dns_dhcp/DnsManager.vue'
import DnsRecords from '@/components/standalone/dns_dhcp/DnsRecords.vue'

const { t } = useI18n()
//TODO: create composable for tabs
const route = useRoute()
const router = useRouter()

const tabs = ref([
  {
    name: 'dhcp',
    label: t('standalone.dns_dhcp.dhcp')
  },
  {
    name: 'static-leases',
    label: t('standalone.dns_dhcp.static_leases')
  },
  {
    name: 'dynamic-leases',
    label: t('standalone.dns_dhcp.dynamic_leases')
  },
  {
    name: 'dns',
    label: t('standalone.dns_dhcp.dns')
  },
  {
    name: 'dns-records',
    label: t('standalone.dns_dhcp.dns_records')
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
  <NeTitle>{{ t('standalone.dns_dhcp.title') }}</NeTitle>
  <div>
    <NeTabs
      :selected="selectedTab"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      :srTabsLabel="t('ne_tabs.tabs')"
      :tabs="tabs"
      class="mb-8"
      @selectTab="selectedTab = $event"
    />
    <DhcpManager v-if="selectedTab === 'dhcp'" />
    <StaticLeases v-else-if="selectedTab === 'static-leases'" />
    <DynamicLeases v-else-if="selectedTab === 'dynamic-leases'" />
    <DnsManager v-else-if="selectedTab === 'dns'" />
    <DnsRecords v-else />
  </div>
</template>
