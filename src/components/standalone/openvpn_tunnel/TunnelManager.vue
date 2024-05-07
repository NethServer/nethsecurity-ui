<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeInlineNotification,
  NeSkeleton,
  NeButton,
  NeEmptyState,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { onMounted, onUnmounted } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TunnelTable from './TunnelTable.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import CreateOrEditTunnelDrawer from './CreateOrEditTunnelDrawer.vue'
import DeleteTunnelModal from './DeleteTunnelModal.vue'
import DownloadTunnelModal from './DownloadTunnelModal.vue'
import ImportConfigurationDrawer from './ImportConfigurationDrawer.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { getProductName } from '@/lib/config'

export type ServerTunnel = {
  id: string
  ns_name: string
  port: string
  topology: string
  enabled: boolean
  local_network: string[]
  remote_network: string[]
  vpn_network: string
  connected: boolean
}

export type ClientTunnel = {
  id: string
  ns_name: string
  topology: string
  enabled: boolean
  port: string
  remote_host: string[]
  remote_network: string[]
  connected: boolean
}

type Tunnel = ServerTunnel | ClientTunnel

const props = defineProps<{
  manageClientTunnels: boolean
}>()

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

const RELOAD_INTERVAL = 10000
const loading = ref(true)
const tunnels = ref<ServerTunnel[] | ClientTunnel[]>([])
const selectedTunnel = ref<Tunnel | null>(null)
const showCreateEditDrawer = ref(false)
const showDeleteModal = ref(false)
const showDownloadModal = ref(false)
const showImportConfigurationDrawer = ref(false)
const fetchTunnelsIntervalId = ref(0)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

async function fetchTunnels(setLoading: boolean = true) {
  try {
    if (setLoading) {
      loading.value = true
    }
    const listTunnelResponse = await ubusCall('ns.ovpntunnel', 'list-tunnels')
    if (props.manageClientTunnels) {
      tunnels.value = listTunnelResponse.data.clients
    } else {
      tunnels.value = listTunnelResponse.data.servers
    }
  } catch (err: any) {
    error.value.notificationTitle = props.manageClientTunnels
      ? t('error.cannot_retrieve_client_tunnels')
      : t('error.cannot_retrieve_server_tunnels')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    if (setLoading) {
      loading.value = false
    }
  }
}

function openCreateEditDrawer(itemToEdit: Tunnel | null) {
  selectedTunnel.value = itemToEdit
  showCreateEditDrawer.value = true
}

function openDeleteModal(itemToDelete: Tunnel) {
  selectedTunnel.value = itemToDelete
  showDeleteModal.value = true
}

function openDownloadModal(itemToDownload: Tunnel) {
  selectedTunnel.value = itemToDownload
  showDownloadModal.value = true
}

function openImportConfigurationDrawer() {
  showImportConfigurationDrawer.value = true
}

function closeModalsAndDrawers() {
  selectedTunnel.value = null
  showDeleteModal.value = false
  showDownloadModal.value = false
  showCreateEditDrawer.value = false
  showImportConfigurationDrawer.value = false
}

function cleanError() {
  error.value = {
    notificationTitle: '',
    notificationDescription: '',
    notificationDetails: ''
  }
}

async function toggleTunnelEnable(tunnel: Tunnel) {
  try {
    cleanError()
    await ubusCall('ns.ovpntunnel', tunnel.enabled ? 'disable-tunnel' : 'enable-tunnel', {
      id: tunnel.id
    })
    await reloadTunnels()
  } catch (err: any) {
    error.value.notificationTitle = t(
      tunnel.enabled ? 'error.cannot_disable_tunnel' : 'error.cannot_enable_tunnel'
    )
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

async function reloadTunnels() {
  cleanError()
  await fetchTunnels()
  await uciChangesStore.getChanges()
}

onMounted(() => {
  fetchTunnels()

  // periodically reload data
  fetchTunnelsIntervalId.value = setInterval(() => fetchTunnels(false), RELOAD_INTERVAL)
})

onUnmounted(() => {
  if (fetchTunnelsIntervalId.value) {
    clearInterval(fetchTunnelsIntervalId.value)
  }
})
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-col justify-between gap-6 xl:flex-row">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{
          manageClientTunnels
            ? t('standalone.openvpn_tunnel.client_tunnel_description', {
                product: getProductName()
              })
            : t('standalone.openvpn_tunnel.server_tunnel_description', {
                product: getProductName()
              })
        }}
      </p>
      <template v-if="tunnels.length > 0">
        <div class="shrink-0" v-if="!manageClientTunnels">
          <NeButton kind="secondary" @click="openCreateEditDrawer(null)">
            <template #prefix>
              <font-awesome-icon
                :icon="['fas', 'circle-plus']"
                class="h-4 w-4"
                aria-hidden="true"
              />
            </template>
            {{ t('standalone.openvpn_tunnel.add_server_tunnel') }}
          </NeButton>
        </div>
        <div
          class="flex shrink-0 flex-row-reverse items-start justify-end gap-4 xl:flex-row"
          v-else
        >
          <NeButton kind="tertiary" @click="openCreateEditDrawer(null)">
            <template #prefix>
              <font-awesome-icon
                :icon="['fas', 'circle-plus']"
                class="h-4 w-4"
                aria-hidden="true"
              />
            </template>
            {{ t('standalone.openvpn_tunnel.add_client_tunnel') }}
          </NeButton>
          <NeButton kind="secondary" @click="openImportConfigurationDrawer">
            <template #prefix>
              <font-awesome-icon
                :icon="['fas', 'circle-arrow-up']"
                class="h-4 w-4"
                aria-hidden="true"
              />
            </template>
            {{ t('standalone.openvpn_tunnel.import_configuration') }}
          </NeButton>
        </div>
      </template>
    </div>
    <NeInlineNotification
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      v-if="error.notificationTitle"
    >
      <template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <NeSkeleton v-if="loading" :lines="8" size="lg" />
    <template v-else>
      <NeEmptyState
        v-if="tunnels.length == 0"
        :title="
          manageClientTunnels
            ? t('standalone.openvpn_tunnel.no_client_tunnel_found')
            : t('standalone.openvpn_tunnel.no_server_tunnel_found')
        "
        :icon="['fas', 'globe']"
        ><NeButton v-if="!manageClientTunnels" kind="primary" @click="openCreateEditDrawer(null)"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'circle-plus']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('standalone.openvpn_tunnel.add_server_tunnel') }}</NeButton
        ><template v-else
          ><div class="flex flex-col gap-y-2">
            <NeButton kind="primary" @click="openImportConfigurationDrawer">
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'circle-arrow-up']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </template>
              {{ t('standalone.openvpn_tunnel.import_configuration') }}
            </NeButton>
            <NeButton kind="tertiary" @click="openCreateEditDrawer(null)">
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'circle-plus']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </template>
              {{ t('standalone.openvpn_tunnel.add_client_tunnel') }}
            </NeButton>
          </div></template
        ></NeEmptyState
      >
      <TunnelTable
        v-else
        :is-client-tunnel="manageClientTunnels"
        :tunnels="tunnels"
        @tunnel-delete="openDeleteModal"
        @tunnel-download="openDownloadModal"
        @tunnel-edit="openCreateEditDrawer"
        @tunnel-toggle-enable="toggleTunnelEnable"
      />
    </template>
  </div>
  <CreateOrEditTunnelDrawer
    :item-to-edit="selectedTunnel"
    @close="closeModalsAndDrawers"
    @add-edit-tunnel="reloadTunnels"
    :is-shown="showCreateEditDrawer"
    :is-client-tunnel="manageClientTunnels"
  />
  <DeleteTunnelModal
    :visible="showDeleteModal"
    :item-to-delete="selectedTunnel"
    @close="closeModalsAndDrawers"
    @tunnel-deleted="reloadTunnels"
  />
  <DownloadTunnelModal
    :visible="showDownloadModal"
    :item-to-download="selectedTunnel"
    @close="closeModalsAndDrawers"
  />
  <ImportConfigurationDrawer
    v-if="manageClientTunnels"
    :is-shown="showImportConfigurationDrawer"
    @close="closeModalsAndDrawers"
    @tunnel-imported="reloadTunnels"
  />
</template>
