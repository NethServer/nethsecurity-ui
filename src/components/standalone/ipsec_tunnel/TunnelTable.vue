<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NeTable from '../NeTable.vue'
import { NeDropdown } from '@nethesis/vue-components'
import { NeButton } from '@nethesis/vue-components'
import type { IpsecTunnel } from '@/views/standalone/vpn/IPsecTunnelView.vue'

const { t } = useI18n()

defineProps<{
  tunnels: IpsecTunnel[]
}>()

const emit = defineEmits(['tunnel-delete', 'tunnel-edit', 'tunnel-toggle-enable'])

const tableHeaders = [
  {
    label: t('standalone.ipsec_tunnel.name'),
    key: 'name'
  },
  {
    label: t('standalone.ipsec_tunnel.local_networks'),
    key: 'local_networks'
  },
  {
    label: t('standalone.ipsec_tunnel.remote_networks'),
    key: 'remote_networks'
  },
  {
    label: t('standalone.ipsec_tunnel.status'),
    key: 'status'
  },
  {
    label: t('standalone.ipsec_tunnel.connection'),
    key: 'connection'
  },
  {
    label: '',
    key: 'menu'
  }
]

function getDropdownItems(item: IpsecTunnel) {
  return [
    {
      id: 'enable_disable',
      label:
        item.enabled === '1'
          ? t('standalone.ipsec_tunnel.disable')
          : t('standalone.ipsec_tunnel.enable'),
      iconStyle: 'fas',
      icon: item.enabled === '1' ? 'circle-xmark' : 'circle-check',
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

function getCellClasses(item: IpsecTunnel) {
  return item.enabled === '0' ? ['text-gray-400', 'dark:text-gray-700'] : []
}
</script>

<template>
  <NeTable :data="tunnels" :headers="tableHeaders">
    <template #name="{ item }: { item: IpsecTunnel }">
      <p :class="[...getCellClasses(item)]">{{ item.name }}</p>
    </template>
    <template #local_networks="{ item }: { item: IpsecTunnel }">
      <template v-if="item.local.length > 0">
        <p
          v-for="(local, idx) in item.local.slice(0, 2)"
          :key="local"
          :class="[...getCellClasses(item)]"
        >
          {{ local }}{{ item.local.length > 2 && idx == 1 ? '...' : '' }}
        </p>
      </template>
      <p :class="[...getCellClasses(item)]" v-else>-</p>
    </template>
    <template #remote_networks="{ item }: { item: IpsecTunnel }">
      <template v-if="item.remote.length > 0">
        <p
          v-for="(remote, idx) in item.remote.slice(0, 2)"
          :key="remote"
          :class="[...getCellClasses(item)]"
        >
          {{ remote }}{{ item.remote.length > 2 && idx == 1 ? '...' : '' }}
        </p>
      </template>
      <p :class="[...getCellClasses(item)]" v-else>-</p>
    </template>
    <template #status="{ item }: { item: IpsecTunnel }">
      <div :class="['flex', 'flex-row', 'items-center', ...getCellClasses(item)]">
        <font-awesome-icon
          :icon="['fas', item.enabled === '1' ? 'circle-check' : 'circle-xmark']"
          class="mr-2 h-5 w-5"
          aria-hidden="true"
        />
        <p>
          {{
            item.enabled === '1'
              ? t('standalone.ipsec_tunnel.enabled')
              : t('standalone.ipsec_tunnel.disabled')
          }}
        </p>
      </div>
    </template>
    <template #connection="{ item }: { item: IpsecTunnel }">
      <div :class="['flex', 'flex-row', 'items-center', ...getCellClasses(item)]">
        <font-awesome-icon
          :icon="['fas', item.connected ? 'circle-check' : 'circle-xmark']"
          :class="[
            'mr-2',
            'h-5',
            'w-5',
            item.enabled === '0'
              ? 'text-gray-400 dark:text-gray-700'
              : item.connected
              ? 'text-green-500'
              : 'text-rose-500'
          ]"
          aria-hidden="true"
        />
        <p>
          {{
            item.connected
              ? t('standalone.ipsec_tunnel.connected')
              : t('standalone.ipsec_tunnel.not_connected')
          }}
        </p>
      </div>
    </template>
    <template #menu="{ item }: { item: IpsecTunnel }">
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
