<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NeTable from '../NeTable.vue'
import { NeDropdown } from '@nethesis/vue-components'
import { NeButton } from '@nethesis/vue-components'
import type { ServerTunnel, ClientTunnel } from './TunnelManager.vue'

const { t } = useI18n()

const props = defineProps<{
  tunnels: ServerTunnel[] | ClientTunnel[]
  isClientTunnel: boolean
}>()

const emit = defineEmits([
  'tunnel-delete',
  'tunnel-edit',
  'tunnel-toggle-enable',
  'tunnel-download'
])

// Lists the table headers for the tunnels.
// The headers vary based on the tunnel type: in the case of a client tunnel, the Remote Hosts header will be included.
// In the case of a server tunnel, the Local Networks and VPN Network headers will be shown instead.
const tableHeaders = [
  {
    label: t('standalone.openvpn_tunnel.name'),
    key: 'name'
  },
  {
    label: t('standalone.openvpn_tunnel.port'),
    key: 'port'
  },
  // Include Local Networks header if the tunnel is a server one
  ...(!props.isClientTunnel
    ? [
        {
          label: t('standalone.openvpn_tunnel.local_networks'),
          key: 'local_networks'
        }
      ]
    : []),
  {
    label: t('standalone.openvpn_tunnel.remote_networks'),
    key: 'remote_networks'
  },
  // Include Remote Hosts header if the tunnel is a client one
  ...(props.isClientTunnel
    ? [
        {
          label: t('standalone.openvpn_tunnel.remote_hosts'),
          key: 'remote_hosts'
        }
      ]
    : []),
  {
    label: t('standalone.openvpn_tunnel.topology'),
    key: 'topology'
  },
  // Include VPN Network header if the tunnel is a server one
  ...(!props.isClientTunnel
    ? [
        {
          label: t('standalone.openvpn_tunnel.vpn_network'),
          key: 'vpn_network'
        }
      ]
    : []),
  {
    label: t('standalone.openvpn_tunnel.status'),
    key: 'status'
  },
  {
    label: t('standalone.openvpn_tunnel.connection'),
    key: 'connected'
  },
  {
    label: '',
    key: 'menu'
  }
]

function getDropdownItems(item: ServerTunnel) {
  return [
    {
      id: 'download',
      label: t('standalone.openvpn_tunnel.download'),
      iconStyle: 'fas',
      icon: 'circle-arrow-down',
      action: () => {
        emit('tunnel-download', item)
      }
    },
    {
      id: 'enable_disable',
      label: item.enabled
        ? t('standalone.openvpn_tunnel.disable')
        : t('standalone.openvpn_tunnel.enable'),
      iconStyle: 'fas',
      icon: item.enabled ? 'circle-xmark' : 'circle-check',
      action: () => {
        emit('tunnel-toggle-enable', item)
      }
    },
    {
      id: 'delete',
      label: t('common.delete'),
      iconStyle: 'fas',
      icon: 'trash',
      danger: true,
      action: () => {
        emit('tunnel-delete', item)
      }
    }
  ]
}

function getCellClasses(item: ServerTunnel | ClientTunnel) {
  return !item.enabled ? ['text-gray-400', 'dark:text-gray-700'] : []
}
</script>

<template>
  <NeTable :data="tunnels" :headers="tableHeaders">
    <template #name="{ item }: { item: ServerTunnel | ClientTunnel }">
      <p :class="[...getCellClasses(item)]">{{ item.ns_name }}</p>
    </template>
    <template #port="{ item }: { item: ServerTunnel | ClientTunnel }">
      <p :class="[...getCellClasses(item)]">{{ item.port }}</p>
    </template>
    <template v-if="!props.isClientTunnel" #local_networks="{ item }: { item: ServerTunnel }">
      <template v-if="item.local_network.length > 0">
        <p
          v-for="(local, idx) in item.local_network.slice(0, 2)"
          :key="local"
          :class="[...getCellClasses(item)]"
        >
          {{ local }}{{ item.local_network.length > 2 && idx == 1 ? '...' : '' }}
        </p>
      </template>
      <p :class="[...getCellClasses(item)]" v-else>-</p>
    </template>
    <template #remote_networks="{ item }: { item: ServerTunnel | ClientTunnel }">
      <template v-if="item.remote_network.length > 0">
        <p
          v-for="(remote, idx) in item.remote_network.slice(0, 2)"
          :key="remote"
          :class="[...getCellClasses(item)]"
        >
          {{ remote }}{{ item.remote_network.length > 2 && idx == 1 ? '...' : '' }}
        </p>
      </template>
      <p :class="[...getCellClasses(item)]" v-else>-</p>
    </template>
    <template v-if="props.isClientTunnel" #remote_hosts="{ item }: { item: ClientTunnel }">
      <template v-if="item.remote_host.length > 0">
        <p
          v-for="(remoteHost, idx) in item.remote_host.slice(0, 2)"
          :key="remoteHost"
          :class="[...getCellClasses(item)]"
        >
          {{ remoteHost }}{{ item.remote_host.length > 2 && idx == 1 ? '...' : '' }}
        </p>
      </template>
    </template>
    <template #topology="{ item }: { item: ServerTunnel | ClientTunnel }">
      <p :class="[...getCellClasses(item)]">
        {{
          item.topology === 'subnet'
            ? t('standalone.openvpn_tunnel.subnet')
            : t('standalone.openvpn_tunnel.p2p')
        }}
      </p>
    </template>
    <template v-if="!props.isClientTunnel" #vpn_network="{ item }: { item: ServerTunnel }">
      <p :class="[...getCellClasses(item)]">{{ item.vpn_network }}</p>
    </template>
    <template #status="{ item }: { item: ServerTunnel | ClientTunnel }">
      <div :class="['flex', 'flex-row', 'items-center', ...getCellClasses(item)]">
        <font-awesome-icon
          :icon="['fas', item.enabled ? 'circle-check' : 'circle-xmark']"
          class="mr-2 h-5 w-5"
          aria-hidden="true"
        />
        <p>
          {{
            item.enabled
              ? t('standalone.openvpn_tunnel.enabled')
              : t('standalone.openvpn_tunnel.disabled')
          }}
        </p>
      </div>
    </template>
    <template #connected="{ item }: { item: ServerTunnel | ClientTunnel }">
      <div :class="['flex', 'flex-row', 'items-center', ...getCellClasses(item)]">
        <font-awesome-icon
          :icon="['fas', item.connected ? 'circle-check' : 'circle-xmark']"
          :class="[
            'mr-2',
            'h-5',
            'w-5',
            item.connected && item.enabled
              ? 'text-green-600 dark:text-green-400'
              : item.enabled
              ? 'text-red-600 dark:text-red-400'
              : ''
          ]"
          aria-hidden="true"
        />
        <p>
          {{
            item.connected
              ? t('standalone.openvpn_tunnel.connected')
              : t('standalone.openvpn_tunnel.not_connected')
          }}
        </p>
      </div>
    </template>
    <template #menu="{ item }: { item: ServerTunnel }">
      <div class="align-center flex justify-end">
        <NeButton kind="tertiary" @click="emit('tunnel-edit', item)">
          <template #prefix>
            <font-awesome-icon
              :icon="['fas', 'pen-to-square']"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </template>
          {{ t('common.edit') }}
        </NeButton>
        <NeDropdown :items="getDropdownItems(item)" :align-to-right="true" />
      </div>
    </template>
  </NeTable>
</template>
