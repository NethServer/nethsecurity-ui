<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeLink, NeHeading } from '@nethesis/vue-components'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SystemInfoCard from '@/components/standalone/dashboard/SystemInfoCard.vue'
import ServiceCard from '@/components/standalone/dashboard/ServiceCard.vue'
import { getStandaloneRoutePrefix } from '@/lib/router'
import router from '@/router'
import { useRoute } from 'vue-router'
import OpenVpnTunnelOrIpsecCard from '@/components/standalone/dashboard/OpenVpnTunnelOrIpsecCard.vue'
import InternetConnectionCard from '@/components/standalone/dashboard/InternetConnectionCard.vue'
import ThreatShieldIpCard from '@/components/standalone/dashboard/ThreatShieldIpCard.vue'
import IpsServiceCard from '@/components/standalone/dashboard/IpsServiceCard.vue'
import MacBindingStatusCard from '@/components/standalone/dashboard/MacBindingStatusCard.vue'
import BackupStatusCard from '@/components/standalone/dashboard/BackupStatusCard.vue'
import HaStatusCard from '@/components/standalone/dashboard/HaStatusCard.vue'
import WireguardCard from '@/components/standalone/dashboard/WireguardCard.vue'
import {
  fetchDashboardSummary,
  getServiceCardInitialData,
  isThreatShieldMonitoringDisabled,
  type DashboardSummary
} from '@/lib/standalone/dashboardSummary'

const { t } = useI18n()
const route = useRoute()
const dashboardSummary = ref<DashboardSummary>()
const isLoadingDashboardSummary = ref(true)

const emptySummary: DashboardSummary = {
  systemInfo: {},
  serviceStatus: {},
  counters: {},
  tunnels: {
    ipsec: { enabled: 0, connected: 0 },
    ovpn: { enabled: 0, connected: 0 }
  },
  threatShield: { monitoringEnabled: true }
}

const serviceCardInitialData = computed(() => ({
  internet: getServiceCardInitialData(dashboardSummary.value ?? emptySummary, 'internet'),
  dnsConfigured: getServiceCardInitialData(
    dashboardSummary.value ?? emptySummary,
    'dns-configured'
  ),
  mwan: getServiceCardInitialData(dashboardSummary.value ?? emptySummary, 'mwan'),
  banip: getServiceCardInitialData(dashboardSummary.value ?? emptySummary, 'banip'),
  netifyd: getServiceCardInitialData(dashboardSummary.value ?? emptySummary, 'netifyd'),
  openvpnRw: getServiceCardInitialData(dashboardSummary.value ?? emptySummary, 'openvpn_rw'),
  threatShieldDns: getServiceCardInitialData(
    dashboardSummary.value ?? emptySummary,
    'threat_shield_dns'
  ),
  dedalo: getServiceCardInitialData(dashboardSummary.value ?? emptySummary, 'dedalo'),
  hosts: getServiceCardInitialData(dashboardSummary.value ?? emptySummary, 'hosts'),
  threatShieldIp: getServiceCardInitialData(
    dashboardSummary.value ?? emptySummary,
    'threat_shield_ip'
  )
}))

onMounted(async () => {
  try {
    dashboardSummary.value = await fetchDashboardSummary()
  } catch (error) {
    console.error(error)
  } finally {
    isLoadingDashboardSummary.value = false
  }
})

function goTo(path: string) {
  router.push(`${getStandaloneRoutePrefix(route)}${path}`)
}
</script>

<template>
  <div class="flex flex-col justify-between md:flex-row md:items-center">
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.dashboard.title') }}</NeHeading>
    <div class="mb-6 text-sm text-gray-500 dark:text-gray-400">
      {{ t('common.data_updated_every_seconds', { seconds: 20 }) }}
    </div>
  </div>

  <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 xl:grid-cols-4 3xl:grid-cols-6">
    <!-- system -->
    <SystemInfoCard
      class="sm:col-span-2 xl:row-span-3"
      :initial-system-info="dashboardSummary?.systemInfo"
      :defer-initial-load="isLoadingDashboardSummary"
    />
    <!-- internet connection -->
    <InternetConnectionCard
      :initial-internet-status="serviceCardInitialData.internet.status"
      :initial-dns-configured-status="serviceCardInitialData.dnsConfigured.status"
      :defer-initial-load="isLoadingDashboardSummary"
    />
    <!-- multiwan -->
    <ServiceCard
      service-name="mwan"
      has-status
      :icon="['fas', 'earth-americas']"
      :initial-status="serviceCardInitialData.mwan.status"
      :defer-initial-load="isLoadingDashboardSummary"
    >
      <template #title>
        <NeLink @click="goTo('/network/multi-wan')">
          {{ t('standalone.dashboard.multiwan') }}
        </NeLink>
      </template>
    </ServiceCard>
    <!-- dpi-core -->
    <ServiceCard
      service-name="netifyd"
      has-status
      :title="t('standalone.dashboard.dpi_core')"
      :icon="['fas', 'bolt']"
      :initial-status="serviceCardInitialData.netifyd.status"
      :defer-initial-load="isLoadingDashboardSummary"
    />
    <!-- openvpn rw -->
    <ServiceCard
      service-name="openvpn_rw"
      has-status
      :counter="{
        name: 'openvpn_rw',
        label: t('standalone.dashboard.clients_connected')
      }"
      :icon="['fas', 'globe']"
      :initial-status="serviceCardInitialData.openvpnRw.status"
      :initial-counter="serviceCardInitialData.openvpnRw.count"
      :defer-initial-load="isLoadingDashboardSummary"
    >
      <template #title>
        <NeLink @click="goTo('/vpn/openvpn-rw')">
          {{ t('standalone.dashboard.openvpn_rw') }}
        </NeLink>
      </template>
    </ServiceCard>
    <!-- ipsec tunnels -->
    <OpenVpnTunnelOrIpsecCard
      method="ipsec-tunnels"
      :initial-counters="dashboardSummary?.tunnels.ipsec"
      :defer-initial-load="isLoadingDashboardSummary"
    >
      <template #title>
        <NeLink @click="goTo('/vpn/ipsec-tunnel')">
          {{ t('standalone.ipsec_tunnel.title') }}
        </NeLink>
      </template>
    </OpenVpnTunnelOrIpsecCard>
    <!-- ovpn tunnels -->
    <OpenVpnTunnelOrIpsecCard
      method="ovpn-tunnels"
      :initial-counters="dashboardSummary?.tunnels.ovpn"
      :defer-initial-load="isLoadingDashboardSummary"
    >
      <template #title>
        <NeLink @click="goTo('/vpn/openvpn-tunnel')">
          {{ t('standalone.openvpn_tunnel.title') }}
        </NeLink>
      </template>
    </OpenVpnTunnelOrIpsecCard>
    <!-- wireguard servers -->
    <WireguardCard>
      <template #title>
        <NeLink @click="goTo('/vpn/wireguard-tunnel')">
          {{ t('standalone.wireguard_tunnel.title') }}
        </NeLink>
      </template>
    </WireguardCard>
    <!-- threat shield IP / banIP -->
    <ThreatShieldIpCard
      :initial-status="serviceCardInitialData.banip.status"
      :initial-counter="serviceCardInitialData.threatShieldIp.count"
      :initial-monitoring-disabled="
        dashboardSummary ? isThreatShieldMonitoringDisabled(dashboardSummary) : undefined
      "
      :defer-initial-load="isLoadingDashboardSummary"
    />
    <!-- MAC binding -->
    <MacBindingStatusCard />
    <!-- IPS -->
    <IpsServiceCard />
    <!-- threat shield dns -->
    <ServiceCard
      service-name="threat_shield_dns"
      has-status
      :icon="['fas', 'shield']"
      :initial-status="serviceCardInitialData.threatShieldDns.status"
      :defer-initial-load="isLoadingDashboardSummary"
    >
      <template #title>
        <NeLink @click="goTo('/security/threat-shield-dns')">
          {{ t('standalone.threat_shield_dns.title') }}
        </NeLink>
      </template>
    </ServiceCard>
    <!-- hotspot -->
    <ServiceCard
      service-name="dedalo"
      has-status
      :icon="['fas', 'wifi']"
      :initial-status="serviceCardInitialData.dedalo.status"
      :defer-initial-load="isLoadingDashboardSummary"
    >
      <template #title>
        <NeLink @click="goTo('/network/hotspot')">
          {{ t('standalone.dashboard.hotspot') }}
        </NeLink>
      </template>
    </ServiceCard>
    <!-- known hosts -->
    <ServiceCard
      service-name="hosts"
      :counter="{
        name: 'hosts',
        label: ''
      }"
      :title="t('standalone.dashboard.known_hosts')"
      :icon="['fas', 'circle-info']"
      :initial-counter="serviceCardInitialData.hosts.count"
      :defer-initial-load="isLoadingDashboardSummary"
    />
    <BackupStatusCard />
    <HaStatusCard />
  </div>
</template>
