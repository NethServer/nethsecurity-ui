<script setup lang="ts">
import { useTabs } from '@/composables/useTabs'
import { NeTabs, NeTitle } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import ServerTunnel from '@/components/standalone/openvpn_tunnel/ServerTunnel.vue'
import ClientTunnel from '@/components/standalone/openvpn_tunnel/ClientTunnel.vue'

const { t } = useI18n()

const { tabs, selectedTab } = useTabs([
  {
    name: 'server-tunnel',
    label: t('standalone.openvpn_tunnel.tabs.server_tunnel')
  },
  {
    name: 'client-tunnel',
    label: t('standalone.openvpn_tunnel.tabs.client_tunnel')
  }
])
</script>

<template>
  <NeTitle>{{ t('standalone.openvpn_tunnel.title') }}</NeTitle>
  <div>
    <NeTabs
      :selected="selectedTab"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      :srTabsLabel="t('ne_tabs.tabs')"
      :tabs="tabs"
      class="mb-8"
      @selectTab="selectedTab = $event"
    />
    <ServerTunnel v-if="selectedTab == 'server-tunnel'" />
    <ClientTunnel v-else />
  </div>
</template>
