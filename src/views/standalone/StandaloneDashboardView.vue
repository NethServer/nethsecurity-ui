<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeLink, NeHeading } from '@nethesis/vue-components'
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

const { t } = useI18n()
const route = useRoute()

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
    <SystemInfoCard class="sm:col-span-2 xl:row-span-3" />
    <!-- internet connection -->
    <InternetConnectionCard />
    <!-- multiwan -->
    <ServiceCard serviceName="mwan" hasStatus :icon="['fas', 'earth-americas']">
      <template #title>
        <NeLink @click="goTo('/network/multi-wan')">
          {{ t('standalone.dashboard.multiwan') }}
        </NeLink>
      </template>
    </ServiceCard>
    <!-- dpi-core -->
    <ServiceCard
      serviceName="netifyd"
      hasStatus
      :title="t('standalone.dashboard.dpi_core')"
      :icon="['fas', 'bolt']"
    />
    <!-- openvpn rw -->
    <ServiceCard
      serviceName="openvpn_rw"
      hasStatus
      :counter="{
        name: 'openvpn_rw',
        label: t('standalone.dashboard.clients_connected')
      }"
      :icon="['fas', 'globe']"
    >
      <template #title>
        <NeLink @click="goTo('/vpn/openvpn-rw')">
          {{ t('standalone.dashboard.openvpn_rw') }}
        </NeLink>
      </template>
    </ServiceCard>
    <!-- ipsec tunnels -->
    <OpenVpnTunnelOrIpsecCard method="ipsec-tunnels">
      <template #title>
        <NeLink @click="goTo('/vpn/ipsec-tunnel')">
          {{ t('standalone.ipsec_tunnel.title') }}
        </NeLink>
      </template>
    </OpenVpnTunnelOrIpsecCard>
    <!-- ovpn tunnels -->
    <OpenVpnTunnelOrIpsecCard method="ovpn-tunnels">
      <template #title>
        <NeLink @click="goTo('/vpn/openvpn-tunnel')">
          {{ t('standalone.openvpn_tunnel.title') }}
        </NeLink>
      </template>
    </OpenVpnTunnelOrIpsecCard>
    <!-- threat shield IP / banIP -->
    <ThreatShieldIpCard />
    <!-- IPS -->
    <IpsServiceCard />
    <!-- threat shield dns -->
    <ServiceCard serviceName="threat_shield_dns" hasStatus :icon="['fas', 'shield']">
      <template #title>
        <NeLink @click="goTo('/security/threat-shield-dns')">
          {{ t('standalone.threat_shield_dns.title') }}
        </NeLink>
      </template>
    </ServiceCard>
    <!-- hotspot -->
    <ServiceCard serviceName="dedalo" hasStatus :icon="['fas', 'wifi']">
      <template #title>
        <NeLink @click="goTo('/network/hotspot')">
          {{ t('standalone.dashboard.hotspot') }}
        </NeLink>
      </template>
    </ServiceCard>
    <!-- known hosts -->
    <ServiceCard
      serviceName="hosts"
      :counter="{
        name: 'hosts',
        label: ''
      }"
      :title="t('standalone.dashboard.known_hosts')"
      :icon="['fas', 'circle-info']"
    />
  </div>
</template>
