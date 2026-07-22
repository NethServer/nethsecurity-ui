<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeHeading, NeLink } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { getStandaloneRoutePrefix } from '@/lib/router'
import router from '@/router'
import { useRoute } from 'vue-router'
import SystemInfoCard from '@/components/standalone/dashboard/SystemInfoCard.vue'
import InternetConnectionCard from '@/components/standalone/dashboard/InternetConnectionCard.vue'
import ServiceCard from '@/components/standalone/dashboard/ServiceCard.vue'
import AlertsCard from '@/components/standalone/dashboard/AlertsCard.vue'
import OpenVpnTunnelOrIpsecCard from '@/components/standalone/dashboard/OpenVpnTunnelOrIpsecCard.vue'
import WireguardCard from '@/components/standalone/dashboard/WireguardCard.vue'
import ThreatShieldIpCard from '@/components/standalone/dashboard/ThreatShieldIpCard.vue'
import MacBindingStatusCard from '@/components/standalone/dashboard/MacBindingStatusCard.vue'
import IpsServiceCard from '@/components/standalone/dashboard/IpsServiceCard.vue'
import BackupStatusCard from '@/components/standalone/dashboard/BackupStatusCard.vue'
import HaStatusCard from '@/components/standalone/dashboard/HaStatusCard.vue'

const { t } = useI18n()
const route = useRoute()

function goTo(path: string) {
  router.push(`${getStandaloneRoutePrefix(route)}${path}`)
}
</script>

<template>
  <div>
    <div class="mb-7 flex flex-wrap items-center gap-4">
      <NeHeading tag="h3" class="mr-auto">{{ t('standalone.dashboard.title') }}</NeHeading>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('common.data_updated_every_seconds', { seconds: 20 }) }}
      </div>
    </div>
    <div
      class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-3 2xl:grid-cols-6"
    >
      <!-- system -->
      <SystemInfoCard class="row-span-3 sm:col-span-2" />
      <!-- internet connection -->
      <InternetConnectionCard />
      <!-- multiwan -->
      <ServiceCard service-name="mwan" has-status :icon="['fas', 'earth-americas']">
        <template #title>
          <NeLink @click="goTo('/network/multi-wan')">
            {{ t('standalone.dashboard.multiwan') }}
          </NeLink>
        </template>
      </ServiceCard>
      <!-- alerts -->
      <AlertsCard />
      <!-- openvpn rw -->
      <ServiceCard
        service-name="openvpn_rw"
        has-status
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
      <!-- wireguard servers -->
      <WireguardCard>
        <template #title>
          <NeLink @click="goTo('/vpn/wireguard-tunnel')">
            {{ t('standalone.wireguard_tunnel.title') }}
          </NeLink>
        </template>
      </WireguardCard>
      <!-- threat shield IP / banIP -->
      <ThreatShieldIpCard />
      <!-- MAC binding -->
      <MacBindingStatusCard />
      <!-- IPS -->
      <IpsServiceCard />
      <!-- threat shield dns -->
      <ServiceCard service-name="threat_shield_dns" has-status :icon="['fas', 'shield']">
        <template #title>
          <NeLink @click="goTo('/security/threat-shield-dns')">
            {{ t('standalone.threat_shield_dns.title') }}
          </NeLink>
        </template>
      </ServiceCard>
      <!-- hotspot -->
      <ServiceCard service-name="dedalo" has-status :icon="['fas', 'wifi']">
        <template #title>
          <NeLink @click="goTo('/network/hotspot')">
            {{ t('standalone.dashboard.hotspot') }}
          </NeLink>
        </template>
      </ServiceCard>
      <!-- known hosts -->
      <ServiceCard
        :counter="{
          name: 'hosts',
          label: ''
        }"
        :title="t('standalone.dashboard.known_hosts')"
        :icon="['fas', 'circle-info']"
      />
      <BackupStatusCard />
      <HaStatusCard />
    </div>
  </div>
</template>
