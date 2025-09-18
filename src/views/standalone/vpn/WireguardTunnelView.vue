<script setup lang="ts">
import { NeHeading, NeTabs } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { useTabs } from '@/composables/useTabs.ts'
import WireguardServerTunnelList from '@/components/standalone/wireguard/WireguardServerTunnelList.vue'
import WireguardPeerTunnelList from '@/components/standalone/wireguard/WireguardPeerTunnelList.vue'

const { t } = useI18n()

const { tabs, selectedTab } = useTabs([
  {
    name: 'server',
    label: t('standalone.wireguard_tunnel.tabs.server')
  },
  {
    name: 'tunnel',
    label: t('standalone.wireguard_tunnel.tabs.tunnel')
  }
])

export type Peer = {
  id: string
  enabled: boolean
  name: string
  pre_shared_key: boolean
  route_all_traffic: boolean
  remote_networks: string[]
  local_networks: string[]
  reserved_ip: string
  config: string
}

export type Tunnel = {
  id: string
  address: string
  client_to_client: boolean
  enabled: boolean
  listen_port: number
  name: string
  network: string
  peers: Peer[]
  public_endpoint: string
  route_all_traffic: boolean
  routes: string[]
  mtu: number
  dns: string
}
</script>

<template>
  <div class="space-y-8">
    <NeHeading tag="h3">{{ t('standalone.wireguard_tunnel.title') }}</NeHeading>
    <NeTabs
      :selected="selectedTab"
      :sr-select-tab-label="t('ne_tabs.select_a_tab')"
      :sr-tabs-label="t('ne_tabs.tabs')"
      :tabs="tabs"
      @select-tab="selectedTab = $event"
    />
    <WireguardServerTunnelList v-if="selectedTab == 'server'" />
    <WireguardPeerTunnelList v-if="selectedTab == 'tunnel'" />
  </div>
</template>
