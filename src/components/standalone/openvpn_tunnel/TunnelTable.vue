<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NeTable from '../NeTable.vue'
import { NeDropdown, NeButton } from '@nethserver/vue-tailwind-lib'
import type { ServerTunnelType, ClientTunnelType } from './TunnelManager.vue'

const { t } = useI18n()

const props = defineProps<{
  tunnels: ServerTunnelType[] | ClientTunnelType[]
  isClientTunnel: boolean
}>()

const emit = defineEmits([
  'tunnel-delete',
  'tunnel-edit',
  'tunnel-toggle-enable',
  'tunnel-download'
])

const tableHeaders = [
  {
    label: t('standalone.openvpn_tunnel.name'),
    key: 'name'
  },
  {
    label: t('standalone.openvpn_tunnel.port'),
    key: 'port'
  },
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
    key: 'connection'
  },
  {
    label: '',
    key: 'menu'
  }
]

function getDropdownItems(item: ServerTunnelType) {
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

function getCellClasses(item: ServerTunnelType) {
  return !item.enabled ? ['text-gray-400', 'dark:text-gray-700'] : []
}
</script>

<template>
  <NeTable :data="tunnels" :headers="tableHeaders">
    <template #name="{ item }: { item: ServerTunnelType | ClientTunnelType }">
      <p :class="[...getCellClasses(item)]">{{ item.name }}</p>
    </template>
    <template #port="{ item }: { item: ServerTunnelType | ClientTunnelType }">
      <p :class="[...getCellClasses(item)]">{{ item.lport }}</p>
    </template>
    <template v-if="!props.isClientTunnel" #local_networks="{ item }: { item: ServerTunnelType }">
      <p :class="[...getCellClasses(item)]">{{ item.locals }}</p>
    </template>
    <template #remote_networks="{ item }: { item: ServerTunnelType | ClientTunnelType }">
      <p :class="[...getCellClasses(item)]">{{ item.remotes }}</p>
    </template>
    <template v-if="props.isClientTunnel" #remote_hosts="{ item }: { item: ClientTunnelType }">
      <p :class="[...getCellClasses(item)]">{{ item.remotes }}</p>
    </template>
    <template #topology="{ item }: { item: ServerTunnelType | ClientTunnelType }">
      <p :class="[...getCellClasses(item)]">{{ item.topology }}</p>
    </template>
    <template v-if="!props.isClientTunnel" #vpn_network="{ item }: { item: ServerTunnelType }">
      <p :class="[...getCellClasses(item)]">{{ item.public_ip }}</p>
    </template>
    <template #status="{ item }: { item: ServerTunnelType | ClientTunnelType }">
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
    <template #connection="{ item }: { item: ServerTunnelType | ClientTunnelType }">
      <div :class="['flex', 'flex-row', 'items-center']">
        <font-awesome-icon
          :icon="['fas', item.connected ? 'circle-check' : 'circle-xmark']"
          :class="['mr-2', 'h-5', 'w-5', item.connected ? 'text-green-500' : 'text-rose-500']"
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
    <template #menu="{ item }: { item: ServerTunnelType }">
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
