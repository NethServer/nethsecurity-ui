<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import NeTable from '../NeTable.vue'
import { NeDropdown, NeModal, NeLink } from '@nethesis/vue-components'
import { NeButton } from '@nethesis/vue-components'
import type { IpsecTunnel } from '@/views/standalone/vpn/IPsecTunnelView.vue'
import {
  faCircleCheck,
  faCircleXmark,
  faTrash,
  faMagnifyingGlassPlus
} from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()

const showDetailsModal = ref(false)
const showRawOutput = ref(false)
const selectedTunnel = ref<IpsecTunnel | null>(null)

function openDetailsModal(tunnel: IpsecTunnel) {
  selectedTunnel.value = tunnel
  showRawOutput.value = false
  showDetailsModal.value = true
}

function closeDetailsModal() {
  showDetailsModal.value = false
  showRawOutput.value = false
  selectedTunnel.value = null
}

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
  const items = []

  items.push({
    id: 'enable_disable',
    label:
      item.enabled === '1'
        ? t('standalone.ipsec_tunnel.disable')
        : t('standalone.ipsec_tunnel.enable'),
    icon: item.enabled === '1' ? faCircleXmark : faCircleCheck,
    action: () => {
      emit('tunnel-toggle-enable', item)
    }
  })

  items.push({
    id: 'delete',
    label: t('common.delete'),
    icon: faTrash,
    danger: true,
    action: () => {
      emit('tunnel-delete', item)
    }
  })

  return items
}

function getCellClasses(item: IpsecTunnel) {
  return item.enabled === '0' ? ['text-green-700', 'dark:text-green-400'] : []
}
</script>

<template>
  <NeTable :data="tunnels" :headers="tableHeaders">
    <template #name="{ item }: { item: IpsecTunnel }">
      <div class="flex items-center gap-2">
        <NeButton
          v-if="item.enabled === '1'"
          kind="tertiary"
          size="sm"
          @click="openDetailsModal(item)"
        >
          <font-awesome-icon :icon="faMagnifyingGlassPlus" class="h-4 w-4" aria-hidden="true" />
        </NeButton>
        <span v-else class="w-8"></span>
        <p :class="[...getCellClasses(item)]">{{ item.name }}</p>
      </div>
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
      <p v-else :class="[...getCellClasses(item)]">-</p>
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
      <p v-else :class="[...getCellClasses(item)]">-</p>
    </template>
    <template #status="{ item }: { item: IpsecTunnel }">
      <div :class="['flex', 'flex-row', 'items-center', ...getCellClasses(item)]">
        <font-awesome-icon
          :icon="['fas', item.enabled === '1' ? 'circle-check' : 'circle-xmark']"
          class="mr-2 h-5 w-5 text-green-700 dark:text-green-400"
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
      <div :class="['flex', 'flex-col', ...getCellClasses(item)]">
        <div class="flex items-center">
          <font-awesome-icon
            :icon="[
              'fas',
              item.connected === 'yes'
                ? 'circle-check'
                : item.connected === 'warning'
                  ? 'triangle-exclamation'
                  : 'circle-xmark'
            ]"
            :class="[
              'mr-2',
              'h-5',
              'w-5',
              item.enabled === '0'
                ? 'text-gray-400 dark:text-gray-700'
                : item.connected === 'yes'
                  ? 'text-green-700 dark:text-green-500'
                  : item.connected === 'warning'
                    ? 'text-amber-500'
                    : 'text-red-600 dark:text-red-400'
            ]"
            aria-hidden="true"
          />
          <div>
            <p>
              {{
                item.connected === 'yes'
                  ? t('standalone.ipsec_tunnel.connected')
                  : item.connected === 'warning'
                    ? t('standalone.ipsec_tunnel.warning')
                    : t('standalone.ipsec_tunnel.not_connected')
              }}
            </p>
            <NeLink v-if="item.connected === 'warning'" @click="openDetailsModal(item)">
              {{ t('standalone.ipsec_tunnel.more_info') }}
            </NeLink>
          </div>
        </div>
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

  <!-- Details Modal -->
  <NeModal
    :visible="showDetailsModal"
    kind="info"
    size="xl"
    :title="t('standalone.ipsec_tunnel.tunnel_details')"
    :primary-label="t('common.close')"
    :close-aria-label="t('common.close')"
    @primary-click="closeDetailsModal"
    @close="closeDetailsModal"
  >
    <template v-if="selectedTunnel">
      <p class="mb-4">
        {{ selectedTunnel.name }} {{ t('standalone.ipsec_tunnel.child_tunnels') }}:
      </p>

      <!-- Children list -->
      <div class="mb-4">
        <ul class="space-y-1">
          <li
            v-for="child in selectedTunnel.children"
            :key="child.name"
            class="flex items-center text-sm"
          >
            <font-awesome-icon
              :icon="['fas', child.installed ? 'circle-check' : 'circle-xmark']"
              :class="[
                'mr-2',
                'h-4',
                'w-4',
                child.installed
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              ]"
              aria-hidden="true"
            />
            <span>{{ child.name }}</span>
            <span class="ml-2 text-gray-500 dark:text-gray-400">
              {{
                child.installed
                  ? t('standalone.ipsec_tunnel.installed')
                  : t('standalone.ipsec_tunnel.not_installed')
              }},
            </span>
            <template v-if="child.local_subnet.length || child.remote_subnet.length">
              <span class="ml-3 text-sm text-gray-500 dark:text-gray-400">
                <template v-if="child.local_subnet.length">{{
                  child.local_subnet.join(', ')
                }}</template>
                <template v-if="child.local_subnet.length && child.remote_subnet.length">
                  →
                </template>
                <template v-if="child.remote_subnet.length">{{
                  child.remote_subnet.join(', ')
                }}</template>
              </span>
            </template>
          </li>
        </ul>
      </div>

      <!-- Raw output toggle -->
      <div>
        <NeLink @click="showRawOutput = !showRawOutput">
          {{
            showRawOutput
              ? t('standalone.ipsec_tunnel.hide_full_status')
              : t('standalone.ipsec_tunnel.show_full_status')
          }}
        </NeLink>
        <pre
          v-if="showRawOutput"
          class="mt-2 max-h-96 overflow-auto rounded bg-gray-100 p-3 text-sm whitespace-pre-wrap dark:bg-gray-800"
          >{{ selectedTunnel.raw_output }}</pre
        >
      </div>
    </template>
  </NeModal>
</template>
